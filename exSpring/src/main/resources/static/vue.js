
let lunchVue;
let contentVue;
let mapVue;

let lastSelectedCategory = "";
var sumLon = 0;
var sumLat = 0;

document.addEventListener("DOMContentLoaded", () => {
  //icon 추가
  function addIcon(a, b, c) {
    restIconFeature = new ol.Feature({
      geometry: new ol.geom.Point([a, b]).transform("EPSG:4326", "EPSG:3857"),
    });

    var iconStyle = new ol.style.Style({
      image: new ol.style.Icon({
        opacity: 1,
        scale: 0.18,
        src: `./img/${c}.png`,
      }),
      zindex: 10,
    });

    restIconFeature.setStyle(iconStyle);
    vectorSource.addFeature(restIconFeature);
  }

  var gaiaIconFeature = new ol.Feature({
    geometry: new ol.geom.Point([127.391055, 36.428902]).transform(
      "EPSG:4326",
      "EPSG:3857"
    ),
  });

  var iconStyle = new ol.style.Style({
    image: new ol.style.Icon({
      opacity: 1,
      scale: 0.5,
      src: "./img/gaia3d.png",
    }),
    zindex: 10,
  });

  gaiaIconFeature.setStyle(iconStyle);

  var vectorSource = new ol.source.Vector({
    features: [gaiaIconFeature]
  });

  var vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    zindex: 999,
  });

  var rasterLayer = new ol.layer.Tile({
    source: new ol.source.OSM()
  });

  //geoserver에서 불러옴
  var wms = new ol.layer.Tile({
    source: new ol.source.TileWMS({
      url: "http://localhost:8180/geoserver/seungminlunch/wms?service=WMS", //레이어 url
      params: {
        VERSION: "1.1.0", //버전
        LAYERS: "seungminlunch:rest", //작업공간: 레이어 명
        BBOX: [
          127.38111114501953, 36.413265228271484, 127.40605926513672,
          36.43330001831055,
        ],
        SRS: "EPSG:4326", //SRID
        FORMAT: "image/png",
      },
      serverType: "geoserver",
      title: "wms"
    }),
    visible: true,
    zindex: 1
  });

  var map = new ol.Map({
    target: "map",
    layers: [rasterLayer, wms, vectorLayer],
    view: new ol.View({
      zoom: 17,
      center: ol.proj.fromLonLat([127.391055, 36.428902])
    }),
  });

  //팝업창
  let popupTable = document.createElement("table");
  popupTable.classList.add("popupTable");

  let popupCloser = document.createElement("a");
  popupCloser.classList.add("popupTableCloser");
  popupCloser.href = "#";

  document.body.appendChild(popupTable);

  var overlay = new ol.Overlay({
    element: popupTable,
  });

  function makePopup(a, b, c) {
    popupTable.innerHTML = "";

    popupTable.appendChild(popupCloser);

    var coordinate = new ol.geom.Point([a, b]).transform(
      "EPSG:4326",
      "EPSG:3857"
    );
    c.forEach((menu) => {
      let menuTr = document.createElement("tr");
      popupTable.appendChild(menuTr);

      let menuTd = document.createElement("td");
      menuTd.classList.add();
      menuTr.appendChild(menuTd);
      menuTd.innerHTML = menu.menu + menu.price;
    });

    map.addOverlay(overlay);
    overlay.setPosition(coordinate.flatCoordinates);
  }

  popupCloser.onclick = function () {
    overlay.setPosition(undefined);
    popupCloser.blur();
    return false;
  };

  //회사 중심
  function zoomGaia() {
    map.getView().setZoom(17);
    map.getView().setCenter(ol.proj.fromLonLat([127.391055, 36.428902]));
  }
  //식당 중심
  function zoomRest(x, y) {
    map.getView().setZoom(18);
    map.getView().setCenter(ol.proj.fromLonLat([x, y]));
  }
  //카테고리 중심
  function zoomCenter(a, b) {
    map.getView().setZoom(17);
    map.getView().setCenter(ol.proj.fromLonLat([a, b]));
    sumLon = 0;
    sumLat = 0;
  }

  // geoserver wms on/off
  function wmsLayerOn() {
    wms.setVisible(true);
  }
  function wmsLayerOff() {
    wms.setVisible(false);
  }

  //contentVue 설정
  contentVue = new Vue({
    el: "#contentWrap",
    data: {
      memberList: [],
      checkedMembers: [],
      searchRest: "",
    },
    methods: {
      init() {
        console.log("init content vue");
      },
      async member() {
        const response = await axios({
          method: "get",
          url: "/member",
          params: {},
        });
        this.memberList = response.data;

        this.checkAllMembers();
      },
      async recommend() {
        lastSelectedCategory = "";

        const response = await axios({
          method: "get",
          url: `/recommend/member/${lunchVue.picked}`,
          params: {
            checkedMembers: this.checkedMembers.join(","),
          },
        });

        lunchVue.restList = response.data;

        vectorSource.clear();
        lunchVue.restList.forEach((rest) => {
          addIcon(rest.restLon, rest.restLat, rest.restCategory);
          sumLon += rest.restLon * 1;
          sumLat += rest.restLat * 1;
        });
        zoomCenter(
          sumLon / lunchVue.restList.length,
          sumLat / lunchVue.restList.length
        );

        vectorSource.addFeature(gaiaIconFeature);
      },

      async search() {
        const response = await axios({
          method: "get",
          url: "/search",
          params: {
            searchRest: this.searchRest,
          },
        });
        if (contentVue.searchRest == "") {
          alert("식당 명을 입력해주세요.");
          return;
        }

        lunchVue.restList = response.data;
        if (lunchVue.restList.length == 0) {
          alert("검색 결과가 없습니다.");
          return;
        }
        lunchVue.restList.forEach((rest) => {
          addIcon(rest.restLon, rest.restLat, rest.restCategory);
        });
        vectorSource.addFeature(gaiaIconFeature);
      },
      memberClear() {
        this.checkedMembers = [];
      },
      checkAllMembers() {
        this.checkedMembers = [];
        this.memberList.forEach((member) => {
          this.checkedMembers.push(member.memberId);
        });
      },
    },
    created() {
      console.log("create content vue");
    },
  });

  // lunch vue 설정
  lunchVue = new Vue({
    el: "#lunchWrap",
    data: {
      picked: "point",
      restList: [],
      restId: "",
      restMenuList: [],
    },
    methods: {
      init() {
        console.log("init lunch vue");
      },

      restClear() {
        this.restList = [];
      },

      async restClick(e) {
        var menuLon = e.currentTarget.getAttribute("lon");
        var menuLat = e.currentTarget.getAttribute("lat");

        const response = await axios({
          method: "get",
          url: "/restmenu",
          params: {
            restId: e.currentTarget.getAttribute("value"),
          },
        });

        menuList = response.data;
        makePopup(menuLon, menuLat, menuList);
        zoomRest(menuLon, menuLat);
      },

      changeRadio() {
        //최근 목록 출처
        if (lastSelectedCategory == "") {
          contentVue.recommend();
          return;
        }
        if (lastSelectedCategory != "") {
          mapVue.categoryRest();
          return;
        }
      },
    },
    created() {
      console.log("create lunch vue");
    },
  });

  //mapVue 설정
  mapVue = new Vue({
    el: "#mapCtrlWrap",
    data: {
      categoryButton: [],
      restCategory: "",
    },
    methods: {
      init() {
        console.log("map Vue init");
      },
      async category() {
        const response = await axios({
          method: "get",
          url: "/category",
          params: {},
        });
        this.categoryButton = response.data;
      },

      async categoryRest(e) {
        if (contentVue.checkedMembers.length == 0) {
          alert("인원을 선택해주세요.");
          return;
        }

        var target = e?.currentTarget;
        if (target) this.restCategory = target.value;
        lastSelectedCategory = this.restCategory;
        const response = await axios({
          method: "get",
          url: `/recommend/category/${lunchVue.picked}`,
          params: {
            checkedMembers: contentVue.checkedMembers.join(","),
            restCategory: this.restCategory,
          },
        });

        lunchVue.restList = response.data;

        vectorSource.clear();
        lunchVue.restList.forEach((rest) => {
          addIcon(rest.restLon, rest.restLat, lastSelectedCategory);
          sumLon += rest.restLon * 1;
          sumLat += rest.restLat * 1;
        });

        zoomCenter(
          sumLon / lunchVue.restList.length,
          sumLat / lunchVue.restList.length
        );

        vectorSource.addFeature(gaiaIconFeature);
      },
      wmsOn() {
        wmsLayerOn();
      },
      wmsOff() {
        wmsLayerOff();
      },
      gaiaOn() {
        zoomGaia();
      },
    },
    created() {},
  });

  contentVue.init();
  contentVue.member();
  lunchVue.init();
  mapVue.init();
  mapVue.category();
});