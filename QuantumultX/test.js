/*
之江杯答案

**************************/



let obj = JSON.parse($response.body || '{}');

console.log(obj);

$notify("", "", obj, "");

$done();
