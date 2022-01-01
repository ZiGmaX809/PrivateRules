/************
通过篡改搜索结果来自定义收听Radio
************/
const obj = JSON.parse($response.body || '{}');
const myRequest = {
    url: `https://raw.githubusercontent.com/ZiGmaX809/PrivateRules/master/QuantumultX/Scripts/CustomRadio/RadioList.json`,
    method: `GET`,
};

$task.fetch(myRequest).then(response => {
    let new_data = []
    let data = JSON.parse(response.body).list;
    let id = 0;

    data.forEach(item => {
        new_data.push({
            "id": id,
            "streamURL": item.url,
            "name": item.name,
            "image_url": item.image,
            "hidden": 0,
            "countryName": "China"
        })
        id++;
    });
    
    obj.data.data = new_data;
    $done({body :JSON.stringify(obj)});
}, reason => {
    console.log(reason.error);
    $done();
});
