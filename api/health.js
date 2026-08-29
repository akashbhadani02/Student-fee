const mongoose=require('mongoose');
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store, no-cache, max-age=0');
  try{
    if(!process.env.MONGODB_URI) return res.status(500).json({ok:false,mongodb:false,error:'MONGODB_URI missing'});
    if(mongoose.connection.readyState!==1) await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
    res.json({ok:true,mongodb:mongoose.connection.readyState===1});
  }catch(e){res.status(500).json({ok:false,mongodb:false,error:e.message});}
};
