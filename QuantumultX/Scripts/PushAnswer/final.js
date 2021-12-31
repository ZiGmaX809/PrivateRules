/*
之江杯答案
**************************/
let obj = JSON.parse($response.body || '{}');
var title = [];
var id = [];
var num = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩']
var choose = ['🅰','🅱','🅲','🅳']

if (obj.code == 3001) {
    for (i = 0; i < 10; i++) {
        let ans = obj.data.list[i].win_id;
        ans.replace('A',choose[0]).replace('B',choose[1]).replace('C',choose[2]).replace('D',choose[3]);
        id.push(num[i] + "[" + ans + "]");
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
