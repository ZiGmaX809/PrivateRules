/************
通过篡改搜索结果来自定义收听Radio
************/

let obj = JSON.parse($response.body || '{}');

console.log("asdasd");

c_body = {
    "data": {
        "current_page": 1,
        "data": [{
            "id": 446945,
            "streamURL": "http://satellitepull.cnr.cn/live/wxzjjtgb/playlist.m3u8",
            "name": "\u6d59\u6c5f\u4ea4\u901a\u4e4b\u58f0",
            "image_url": "https://gitee.com/radioer/transparentlogo/raw/master/generalradio/%E6%B5%99%E6%B1%9F%E4%BA%A4%E9%80%9A%E4%B9%8B%E5%A3%B0.png",
            "hidden": 0,
            "countryName": "China"
        },{
            "id": 446945,
            "streamURL": "http://satellitepull.cnr.cn/live/wxzjzs/playlist.m3u8",
            "name": "\u6d59\u6c5f\u4e4b\u58f0",
            "image_url": "https://gitee.com/radioer/transparentlogo/raw/master/generalradio/%E6%B5%99%E6%B1%9F%E4%B9%8B%E5%A3%B0.png",
            "hidden": 0,
            "countryName": "China"
        }],
        "first_page_url": "https://backend.moon.fm/api/search?page=1",
        "from": 1,
        "last_page": 1,
        "last_page_url": "https://backend.moon.fm/api/search?page=1",
        "next_page_url": null,
        "path": "https://backend.moon.fm/api/search",
        "per_page": 20,
        "prev_page_url": null,
        "to": 15,
        "total": 15
    },
    "search_type": "radio"
}

$done({ body: JSON.stringify(c_body) });
