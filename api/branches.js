const mongoose = require('mongoose');
const crypto = require('crypto');
const PASSWORD_KEYS = ["pageOpen","studentAdd","studentEdit","studentDelete","collectionAdd","collectionEdit","collectionDelete","excelExport","excelImport"];
const DEFAULT_PERMISSIONS = Object.fromEntries(PASSWORD_KEYS.map(k=>[k,true]));
const branchSchema = new mongoose.Schema({name:{type:String,required:true,unique:true,trim:true},code:{type:String,required:true,unique:true,trim:true,uppercase:true},active:{type:Boolean,default:true}},{timestamps:true});
const userSchema = new mongoose.Schema({username:{type:String,required:true,unique:true,trim:true},passwordHash:{type:String,required:true},passwordEncrypted:{type:String,default:''},branchId:{type:mongoose.Schema.Types.ObjectId,ref:'Branch',required:true},role:{type:String,default:'branch_admin'},permissions:{type:Map,of:Boolean,default:{}}},{timestamps:true});
const Branch=mongoose.models.Branch||mongoose.model('Branch',branchSchema);
const BranchUser=mongoose.models.BranchUser||mongoose.model('BranchUser',userSchema);
const adminSchema = new mongoose.Schema({key:{type:String,unique:true,default:'main'},passwordHashes:{type:Map,of:String,default:{}},passwordHash:String},{timestamps:true});
const AdminSettings=mongoose.models.AdminSettings||mongoose.model('AdminSettings',adminSchema);
function sha(v){return crypto.createHash('sha256').update(String(v)).digest('hex');}
function hashPw(v){const salt=crypto.randomBytes(16).toString('hex');const h=crypto.scryptSync(String(v),salt,64).toString('hex');return salt+':'+h;}
function checkPw(v,stored){if(!stored||!stored.includes(':'))return sha(v)===stored;const [salt,h]=stored.split(':');const got=crypto.scryptSync(String(v),salt,64).toString('hex');return crypto.timingSafeEqual(Buffer.from(got,'hex'),Buffer.from(h,'hex'));}
function encPw(v){const key=crypto.createHash('sha256').update(process.env.BRANCH_CREDENTIAL_KEY||process.env.MONGODB_URI||'change-this-secret').digest();const iv=crypto.randomBytes(12);const c=crypto.createCipheriv('aes-256-gcm',key,iv);const ct=Buffer.concat([c.update(String(v),'utf8'),c.final()]);return [iv.toString('base64url'),c.getAuthTag().toString('base64url'),ct.toString('base64url')].join('.');}
function decPw(v){try{const key=crypto.createHash('sha256').update(process.env.BRANCH_CREDENTIAL_KEY||process.env.MONGODB_URI||'change-this-secret').digest();const [iv,tag,ct]=String(v||'').split('.');if(!iv||!tag||!ct)return '';const d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64url'));d.setAuthTag(Buffer.from(tag,'base64url'));return Buffer.concat([d.update(Buffer.from(ct,'base64url')),d.final()]).toString('utf8');}catch(e){return '';}}
const SECRET=process.env.BRANCH_AUTH_SECRET||process.env.MONGODB_URI||'change-this-secret';
function sign(payload){const raw=Buffer.from(JSON.stringify(payload)).toString('base64url');const sig=crypto.createHmac('sha256',SECRET).update(raw).digest('base64url');return raw+'.'+sig;}
function verifyToken(token){try{const [raw,sig]=String(token||'').split('.');if(!raw||!sig)return null;const expected=crypto.createHmac('sha256',SECRET).update(raw).digest('base64url');if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const p=JSON.parse(Buffer.from(raw,'base64url').toString());if(!p.exp||Date.now()>p.exp)return null;return p;}catch(e){return null;}}
async function db(){
  if(!process.env.MONGODB_URI)throw Error('MONGODB_URI environment variable is missing.');
  if(!global.__feesDb)global.__feesDb=mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
  await global.__feesDb;
  // Seed default branches only for a completely new/empty database.
  // IMPORTANT: never recreate old default names after the admin renames a branch.
  const branchCount=await Branch.countDocuments();
  if(branchCount===0){
    const seeds=[['Velanja','VELANJ'],['Mota Varachha','MOTAVA'],['Mission Road','MISSION']];
    for(const [name,code] of seeds){
      const b=await Branch.create({name,code,active:true});
      const pw=code+'@2026';
      await BranchUser.create({username:code.toLowerCase()+'_admin',passwordHash:hashPw(pw),passwordEncrypted:encPw(pw),branchId:b._id,permissions:DEFAULT_PERMISSIONS});
    }
  }
  return global.__feesDb;
}
async function adminOk(req){
  const supplied=String(req.headers['x-admin-password']||'');
  if(!supplied)return false;
  const key=String(req.headers['x-admin-action']||'pageOpen');
  // The configured ADMIN_PASSWORD is always a valid main-admin credential.
  // This also makes deployments resilient when an older AdminSettings document
  // exists in MongoDB with a different/legacy password hash.
  if((process.env.ADMIN_PASSWORD && supplied===String(process.env.ADMIN_PASSWORD)) || (!process.env.ADMIN_PASSWORD && supplied==='1316618'))return true;
  let a=await AdminSettings.findOne({key:'main'});
  if(!a){
    const h=sha(process.env.ADMIN_PASSWORD||'1316618'); const hashes={};
    PASSWORD_KEYS.forEach(k=>hashes[k]=h);
    try{a=await AdminSettings.create({key:'main',passwordHash:h,passwordHashes:hashes});}
    catch(e){a=await AdminSettings.findOne({key:'main'});}
  }
  if(!a)return false;
  let stored='';
  if(a.passwordHashes){
    stored=typeof a.passwordHashes.get==='function' ? (a.passwordHashes.get(key)||'') : (a.passwordHashes[key]||'');
  }
  if(!stored && a.passwordHash)stored=a.passwordHash;
  return !!stored && (stored===sha(supplied) || checkPw(supplied,stored));
}
function mainAdmin(req){return String(req.headers['x-main-admin']||'')==='true' && req.headers['x-admin-password'];}
async function handler(req,res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization,X-Admin-Password,X-Admin-Action,X-Main-Admin');res.setHeader('Cache-Control','no-store');if(req.method==='OPTIONS')return res.status(204).end();try{await db();if(!(await adminOk(req))||!mainAdmin(req))return res.status(401).json({error:'Main admin access required.'});
 if(req.method==='GET'){const rows=await Branch.find().sort({name:1}).lean();const users=await BranchUser.find().populate('branchId','name code').sort({username:1}).lean();return res.json({branches:rows,users:users.map(u=>({id:u._id,username:u.username,branchId:u.branchId,password:u.passwordEncrypted?decPw(u.passwordEncrypted):'',passwordAvailable:!!u.passwordEncrypted,permissions:(u.permissions instanceof Map ? Object.fromEntries(u.permissions.entries()) : Object.fromEntries(Object.entries(u.permissions||{})))}))});}
 const b=req.body||{};
 if(req.method==='POST'){const name=String(b.name||'').trim(),code=String(b.code||'').trim().toUpperCase(),username=String(b.username||'').trim(),password=String(b.password||'');if(!name||!code||!username||password.length<4)return res.status(400).json({error:'Branch name, code, username and password (min 4) are required.'});const branch=await Branch.create({name,code,active:b.active!==false});const permissions={...DEFAULT_PERMISSIONS,...(b.permissions||{})};const user=await BranchUser.create({username,passwordHash:hashPw(password),passwordEncrypted:encPw(password),branchId:branch._id,permissions});return res.json({ok:true,branch,user:{id:user._id,username:user.username,password}});}
 if(req.method==='PUT'){if(b.type==='branch'){const existing=await Branch.findById(b.id);if(!existing)return res.status(404).json({error:'Branch not found.'});const oldName=existing.name;existing.name=String(b.name||'').trim();existing.code=String(b.code||'').trim().toUpperCase();existing.active=b.active!==false;await existing.save();const Student=mongoose.models.Student||mongoose.model('Student',new mongoose.Schema({branch:String,branchId:{type:mongoose.Schema.Types.ObjectId,default:null}}));const History=mongoose.models.CollectionHistory||mongoose.model('CollectionHistory',new mongoose.Schema({branch:String,branchId:{type:mongoose.Schema.Types.ObjectId,default:null}}));if(oldName!==existing.name){await Student.updateMany({branchId:existing._id},{$set:{branch:existing.name}});await History.updateMany({branchId:existing._id},{$set:{branch:existing.name}});}return res.json({ok:true,branch:existing});}// Update branch login. Prefer the BranchUser id, but also support branchId.
 // This makes the admin UI resilient when the login list was loaded from a fallback source.
 let user=null;
 if(b.id && mongoose.isValidObjectId(b.id)) user=await BranchUser.findById(b.id);
 const targetBranchId=b.branchId || (user?String(user.branchId):'');
 if(!user && targetBranchId && mongoose.isValidObjectId(targetBranchId)) user=await BranchUser.findOne({branchId:targetBranchId});
 if(!user && targetBranchId && mongoose.isValidObjectId(targetBranchId)){
   const branch=await Branch.findById(targetBranchId);
   if(!branch)return res.status(404).json({error:'Branch not found.'});
   const username=String(b.username||'').trim().toLowerCase();
   const password=String(b.password||'');
   if(!username||password.length<4)return res.status(400).json({error:'This branch has no login yet. Enter a username and password (minimum 4 characters).'});
   user=await BranchUser.create({username,passwordHash:hashPw(password),passwordEncrypted:encPw(password),branchId:targetBranchId,permissions:{...DEFAULT_PERMISSIONS,...(b.permissions||{})}});
 }else if(!user){return res.status(404).json({error:'Branch login not found. Select the branch and save a username/password to create its login.'});}
 const newUsername=String(b.username||'').trim().toLowerCase();
 if(!newUsername)return res.status(400).json({error:'Login ID / username is required.'});
 // A username belongs to only one branch. Check before saving so the admin gets
 // a useful error instead of a MongoDB duplicate-key error.
 const duplicate=await BranchUser.findOne({_id:{$ne:user._id},username:newUsername}).lean();
 if(duplicate)return res.status(409).json({error:'This Login ID is already used by another branch. Please choose a different Login ID.'});
 user.username=newUsername;
 if(b.branchId){
   if(!mongoose.isValidObjectId(String(b.branchId)))return res.status(400).json({error:'Invalid branch selected.'});
   const branch=await Branch.findById(b.branchId).lean();
   if(!branch)return res.status(404).json({error:'Branch not found.'});
   user.branchId=b.branchId;
 }
 // Password is updated ONLY when the admin entered a new password. Blank means
 // keep the existing database password unchanged.
 if(Object.prototype.hasOwnProperty.call(b,'password') && String(b.password)!==''){
   const nextPassword=String(b.password);
   if(nextPassword.length<4)return res.status(400).json({error:'Password must be at least 4 characters.'});
   user.passwordHash=hashPw(nextPassword);
   user.passwordEncrypted=encPw(nextPassword);
 }
 if(Object.prototype.hasOwnProperty.call(b,'permissions')){
   const nextPermissions={...DEFAULT_PERMISSIONS};
   for(const key of PASSWORD_KEYS) nextPermissions[key]=b.permissions[key]!==false;
   user.permissions=new Map(Object.entries(nextPermissions));
 }
 await user.save();
 return res.json({ok:true,savedToDatabase:true,user:{id:String(user._id),username:user.username,branchId:String(user.branchId),passwordUpdated:Object.prototype.hasOwnProperty.call(b,'password')&&String(b.password)!==''}});}
 if(req.method==='DELETE'){if(b.type==='branch'){const branch=await Branch.findById(b.id);if(!branch)return res.status(404).json({error:'Branch not found.'});const Student=mongoose.models.Student||mongoose.model('Student',new mongoose.Schema({branchId:{type:mongoose.Schema.Types.ObjectId,default:null}}));const History=mongoose.models.CollectionHistory||mongoose.model('CollectionHistory',new mongoose.Schema({branchId:{type:mongoose.Schema.Types.ObjectId,default:null}}));const students=await Student.countDocuments({branchId:b.id});const histories=await History.countDocuments({branchId:b.id});if(students||histories)return res.status(400).json({error:`Cannot delete ${branch.name}. It still has ${students} students and ${histories} collection entries. Move the data first.`});await BranchUser.deleteMany({branchId:b.id});await Branch.findByIdAndDelete(b.id);return res.json({ok:true});}await BranchUser.findByIdAndDelete(b.id);return res.json({ok:true});}
 return res.status(405).json({error:'Method not allowed'});
 }catch(e){console.error(e);return res.status(500).json({error:e.code===11000?'Branch code/name or username already exists.':e.message||'Server error'});}}
module.exports=handler; module.exports.Branch=Branch; module.exports.BranchUser=BranchUser; module.exports.DEFAULT_PERMISSIONS=DEFAULT_PERMISSIONS; module.exports.PASSWORD_KEYS=PASSWORD_KEYS; module.exports.hashPw=hashPw; module.exports.checkPw=checkPw; module.exports.encPw=encPw; module.exports.sign=sign; module.exports.verifyToken=verifyToken; module.exports.db=db; module.exports.adminOk=adminOk; module.exports.mainAdmin=mainAdmin;
