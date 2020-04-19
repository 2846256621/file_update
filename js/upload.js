let fileBox = document.getElementById('file');
let reader = null;  //读取操作对象
let step = 1024 * 256;  //每次读取文件大小 ,字节数
let cuLoaded = 0; //当前已经读取总数
let file = null; //当前读取的文件对象
let enableRead = true;//标识是否可以读取文件
let total = 0;        //记录当前文件总字节数
let startTime = null; //标识开始上传时间
let ws = null;
window.onload = function () {
    //页面加载完建立链接
    let url = 'ws://localhost:3000';
    ws = new WebSocket(url);
    createSocket();
};

/**
 * 创建和服务器的WebSocket 链接
 */
function createSocket() {
    ws.onopen = function () {
        console.log('connected成功');
    };
    ws.onmessage = function (e) {
        let data = e.data;
        if (isNaN(data) === false) {
            console.log('当前上传成功：' + data);
        } else {
            document.getElementById('result_msg').innerHTML = `
              上传结果：<span style="color: #df5000">${data}</span>
            `
        }
    };
    ws.onclose = function (e) {
        //中止客户端读取
        stop();
        console.log('链接断开');
    };
    ws.onerror = function (e) {
        //中止客户端读取
        stop();
        console.log('传输中发生异常');
    }
}
fileBox.onchange = function () {
    //获取文件对象
    file = this.files[0];
    total = file.size;
    console.info("文件大小：" + file.size);
    if (ws == null) {
        if (window.confirm('建立与服务器链接失败,确定重试链接吗')) {
            createSocket(function () {
                bindReader();
            });
        }
        return;
    }
    bindReader();
};
//绑定reader
function bindReader() {
    cuLoaded = 0;
    startTime = new Date();
    enableRead = true;
    reader = new FileReader();//读取二进制数据
    //读取一段成功(读取操作成功完成时调用)
    reader.onload = function (e) {
        console.log('读取总数：' + e.loaded);
        if (enableRead === false)  //暂停读取
            return false;
        //根据当前缓冲区来控制客户端读取速度
        if (ws.bufferedAmount > step * 10) {
            setTimeout(function () {
                //继续读取
                console.log('进入等待');
                loadSuccess(e.loaded);
            }, 3);
        } else {
            //继续读取
            loadSuccess(e.loaded);
        }
    };
    //开始读取
    readBlob();
}
/**
 * todo 读取文件成功处理
 * */
function loadSuccess(loaded) {
    let data = {
        type:'upload',
        name:file.name,
        size:(cuLoaded/1024/1024).toFixed(1)
    };
    ws.send(JSON.stringify(data));

    let bolb = reader.result;
    ws.send(bolb);
    //如果没有读完，继续
    cuLoaded += loaded;
    if (cuLoaded < total) {
        readBlob(); //分块读取
    } else {
        let mb = (cuLoaded/1024/1024).toFixed(1);
        let kb = (cuLoaded/1024).toFixed(1);
        document.getElementById('result').innerText= `
        总共上传：${mb>0?mb:kb} ${mb>0?'MB':'KB'}
        总共用时：${(new Date().getTime() - startTime.getTime()) / 1000}s`;
    }
    //显示结果进度
    let percent = ((cuLoaded / total) * 100).toFixed(0);
    document.getElementById('Status').innerText = percent+"%";
    document.getElementById('progressOne').value = percent;
}

/**
 * 指定开始位置，分块读取文件
 */
function readBlob() {
    //指定开始位置和结束位置读取文件 （分片上传）
    let blob = file.slice(cuLoaded, cuLoaded + step);
    //异步字节读取内容，结果用二进制ArrayBuffer表示（是个数组）
    reader.readAsArrayBuffer(blob);
}
//中止
function stop() {
    //中止读取操作
    console.info('中止，cuLoaded：' + cuLoaded);
    enableRead = false;
    reader.abort(); //终止文件读取操作
}
//继续
function containue() {
    console.info('继续，cuLoaded：' + cuLoaded);
    enableRead = true;
    readBlob(); //继续读取
}

/**
 * 上传文件
 */
function fileUp() {
    let file_up = document.getElementsByClassName('container')[0];
    let file_down = document.getElementsByClassName('container')[1];
    file_up.style.display = 'block';
    file_down.style.display = 'none';
    //页面加载完建立链接
    createSocket();
}

/**
 * 获取下载文件的列表
 */
function fileDown() {
    let file_up = document.getElementsByClassName('container')[0];
    let file_down = document.getElementsByClassName('container')[1];
    let file_list = document.getElementById('file-list');
    file_up.style.display = 'none';
    file_down.style.display = 'block';
    file_list.innerText = '';
    let data = {
        type:'download'
    };
    ws.send(JSON.stringify(data));
    ws.onmessage = function (e) {
        let data = JSON.parse(e.data);
        console.log(data);
        data.data.forEach(item=>{
            let li_item = document.createElement('li');
            let mb = (item.size/1024/1024).toFixed(1);
            let kb = (item.size/1024).toFixed(1);
            li_item.innerHTML =`  
                    <span style="float:right;">文件大小：${mb>0?mb:kb}${mb>0?'MB':'KB'}</span>
                    <span class="iconfont icon-xiazai" style="margin: 0 5px 0 -5px;padding: 3px 5px;" id="${item.url}"></span>
                     ${item.name}
                `;
            li_item.addEventListener('click', function (ev) {
                 let target = ev.target || ev.srcElement;
                if (target.id) {
                     downloadItem(item);
                   }
            });
            file_list.append(li_item);
        })
    };
    ws.close = function () {
        console.log('断开连接')
    }
}

/**
 * 下载单个文件
 */
function downloadItem(item) {
    console.log(item);
    let data = {
        type:'download_item',
        name:item.name,
        url:item.url
    };
    ws.send(JSON.stringify(data));
    ws.onmessage = function (e) {
        let datas = JSON.parse(e.data);
        alert(`
          下载结果：${datas.msg}
          文件存储位置：${datas.url}
        `);
    };
}

