# P1 WebGIS二维个人作品集

## 运行方法
1. 进入本目录。
2. 使用 VS Code Live Server、`python -m http.server 8000` 或任意静态服务器启动。
3. 浏览器访问 `http://localhost:8000`。

## 功能覆盖
- Leaflet 1.9.4：OSM/Carto/天地图预留、多 POI 标注、Popup、Tooltip、书签定位、比例尺、坐标显示、距离测量。
- GeoJSON 专题图：行政区分级设色、POI 比例符号、pointToLayer、filter、图例。
- MapLibre GL JS 4.7+：矢量瓦片底图、GeoJSON Source/Layer、数据驱动样式、点聚合、fill-extrusion 建筑拉伸、样式切换。
- P1 综合作品集：信息面板、图层联动、统一 UI。

## 部署到 GitHub Pages
将本目录上传到 GitHub 仓库，在 Settings -> Pages 中选择 main 分支根目录发布。发布后把实验报告中的链接替换为：
`https://<你的GitHub用户名>.github.io/<仓库名>/`
