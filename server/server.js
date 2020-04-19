const express = require('express');
const app = express();
const WebSocket = require('ws');
const fs = require('fs');
const path = require("path");
let file_name = '';
let wss1 = new WebSocket.Server({port:3000});
wss1.on('connection',function (ws) {
    ws.on('message',function (data) {
         if(typeof data === 'string'){
             data = JSON.parse(data);
         }else{
             fs.appendFile(`../upload_file/${file_name}`,data, function (err) {
                 if (err) {
                     console.log('写入失败', err);
                     ws.send('上传失败');
                 } else {
                     console.log('写入成功');
                     ws.send('上传成功');
                 }
             });
         }
        switch (data.type) {
            case 'upload':
                file_name = data.name;
                break;
            case 'download':
                let pathName = "../upload_file";
                let dirs;
                //读取新建的文件夹 目录及其内容返回
                fs.readdir(pathName, function(err, files) {
                    dirs = [];
                    (function iterator(i) {
                        if (i === files.length) {
                            return;
                        }
                        let filedir = path.join(pathName, files[i]);
                        fs.stat(filedir, function (err, data) {
                            let size = data.size;
                            if (data.isFile()) {
                                fs.readFile(filedir, function (error, data) {
                                    if (error) {
                                        console.log(error);
                                        return false;
                                    }
                                    dirs.push({
                                        name: files[i],
                                        url: path.join(__dirname.replace('server','upload_file'),files[i]),
                                        size: size
                                    });
                                    if (files[i] === files[files.length - 1])
                                        ws.send(JSON.stringify({data: dirs}));
                                })
                            }
                            iterator(i + 1);
                        });
                    })(0);
                });
                break;
            case 'download_item':
                fs.readFile(`../upload_file/${data.name}`, function (error, datas) {
                    if (error) {
                        console.log(error);
                        return false;
                    }
                    else{
                        // console.log(datas);
                        fs.appendFile(`../download_file/${data.name}`, datas, function (err) {
                            let url = data.url.replace('upload_file','download_file');
                            if (err) {
                                console.log('下载失败', err);
                                let data_msg = {
                                    msg:'下载失败',
                                    url:'error'
                                };
                                ws.send(JSON.stringify(data_msg));
                            } else {
                                console.log('下载成功');
                                let data_msg = {
                                    msg:'下载成功',
                                    url
                                };
                                ws.send(JSON.stringify(data_msg));
                            }
                        });
                    }

                });

                break;
            default:
                console.log(data);
                // ws.send('error')
        }

    })
});

app.listen(4000,function () {
    console.log("http://localhost:4000");
});