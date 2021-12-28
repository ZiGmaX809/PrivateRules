
const $ = new Env(ScriptName);

const res = $request;
let resp = null;
try{
  resp =$response
  console.log(resp)
}catch(err){
  console.log(err)
};
