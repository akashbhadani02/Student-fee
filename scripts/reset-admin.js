require('dotenv').config();
const mongoose=require('mongoose'),crypto=require('crypto');
const uri=process.env.MONGODB_URI,password=process.env.ADMIN_PASSWORD||'1316618';
if(!uri){console.error('MONGODB_URI is missing in .env');process.exit(1)}
const schema=new mongoose.Schema({key:{type:String,unique:true},passwordHashes:{type:Map,of:String},passwordHash:String},{timestamps:true});
const Admin=mongoose.models.AdminSettings||mongoose.model('AdminSettings',schema);
const keys=['pageOpen','studentAdd','studentEdit','studentDelete','collectionAdd','collectionEdit','collectionDelete','excelExport','excelImport'];
const hash=crypto.createHash('sha256').update(password).digest('hex');
(async()=>{await mongoose.connect(uri);let a=await Admin.findOne({key:'main'});if(!a)a=new Admin({key:'main'});a.passwordHash=hash;a.passwordHashes=new Map(keys.map(k=>[k,hash]));await a.save();console.log('Admin password reset successfully.');await mongoose.disconnect()})().catch(e=>{console.error(e.message);process.exit(1)});
