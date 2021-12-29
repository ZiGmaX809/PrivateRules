/*
之江杯答案

**************************/
let obj = JSON.parse($response.body || '{}');
var title = [];
var id = [];
var num = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩']

if (obj.code == 3001) {
    for (i = 0; i < 10; i++) {
        //title.push(obj.data.list[i].title);
        id.push("[" + num[i] + obj.data.list[i].win_id + "]");
        //$notify("之江杯答案", obj.data.list[i].win_id, obj.data.list[i].title);
        //delay(3);
    }
    //$notify("之江杯答案", "", list);
    //console.log(id.toString());
    $notify("之江杯答案", "", id.toString());
}

function delay(n) {
    return new Promise(function (resolve) {
        setTimeout(resolve, n * 1000);
    });
}

$done();
