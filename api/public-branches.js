const {db,Branch,BranchUser}=require('./branches');
module.exports=async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','no-store, no-cache, max-age=0');
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  try{
    await db();
    const branches=await Branch.find({}).sort({name:1}).lean();
    const users=await BranchUser.find({}).select('username branchId').lean();
    const byBranch=new Map(users.map(u=>[String(u.branchId),u.username]));
    return res.json({branches:branches.map(b=>({_id:b._id,name:b.name,code:b.code,active:b.active!==false,username:byBranch.get(String(b._id))||''}))});
  }catch(e){return res.status(500).json({error:e.message||'Server error'});}
};
