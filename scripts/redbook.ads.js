/***********************************************
> 应用名称：小红书去广告脚本（rnote 兼容修复版）
> 原作者：@ddgksf2013
> 修复说明：
>   1. 搜索 notes：过滤 model_type=ads / hot_query，兼容 so.rnote.com v10
>   2. 评论图片：处理 comments + sub_comments 的 pictures，优先 meme_package / origin_url
>   3. 保留首页瀑布流、笔记保存去水印、分类、开屏等原有逻辑
> 更新时间：2026-09-23
***********************************************/

const version = "V1.0.29-rnote-fix";
const $ = new Env("小红书");
$.RedBookPhotoKey = "RedBookPhotoKey";
$.RedBookVideoKey = "RedBookVideoKey";

let body = $response.body;
if (!body) {
  $done({});
} else {
  handleBody();
}

function handleBody() {
  const url = $request.url;

  // 首页瀑布流广告
  if (
    /\/api\/sns\/v\d+\/homefeed(?:\?|$)/.test(url) &&
    !/\/homefeed\/categories(?:\?|$)/.test(url)
  ) {
    try {
      const obj = JSON.parse(body);
      if (Array.isArray(obj.data)) {
        const before = obj.data.length;
        obj.data = obj.data.filter(function (item) {
          return (
            !item ||
            (item.is_ads !== true &&
              !item.ads_info &&
              item.is_ad !== true &&
              !item.ad_info)
          );
        });
        console.log(
          "[小红书] homefeed removed " + (before - obj.data.length) + " ad item(s)"
        );
      }
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("[小红书] homefeed: " + e);
    }
    return $done({ body });
  }

  // 搜索结果广告（兼容 v10 + model_type=ads）
  if (/\/api\/sns\/v\d+\/search\/notes(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      const list =
        (obj.data && obj.data.items) ||
        (Array.isArray(obj.data) ? obj.data : null);
      if (Array.isArray(list)) {
        const before = list.length;
        const filtered = list.filter(function (item) {
          if (!item) return false;
          // 新结构：model_type === "ads" / "hot_query"
          if (item.model_type === "ads" || item.model_type === "hot_query")
            return false;
          // 旧结构
          if (item.ads || item.is_ads || item.is_ad || item.ads_info || item.ad_info)
            return false;
          const note = item.note || {};
          if (note.is_ads || note.is_ad || note.ads_info || note.ad_info)
            return false;
          return true;
        });
        if (obj.data && obj.data.items) {
          obj.data.items = filtered;
        } else {
          obj.data = filtered;
        }
        console.log(
          "[小红书] search/notes removed " + (before - filtered.length) + " ad item(s)"
        );
      }
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("[小红书] search/notes: " + e);
    }
    return $done({ body });
  }

  // 评论列表：去水印（含 sub_comments）
  if (/\/api\/sns\/v\d+\/note\/comment\/list(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      const fixPictures = function (pics) {
        if (!Array.isArray(pics)) return;
        for (let i = 0; i < pics.length; i++) {
          const pic = pics[i];
          if (!pic || typeof pic !== "object") continue;
          // 优先 meme_package（通常无额外水印处理），其次 origin_url
          if (pic.meme_package && pic.meme_package.image_url) {
            pic.url = pic.meme_package.image_url;
            pic.origin_url = pic.meme_package.image_url;
          } else if (pic.origin_url) {
            pic.url = pic.origin_url;
          }
        }
      };
      const comments = (obj.data && obj.data.comments) || [];
      for (let i = 0; i < comments.length; i++) {
        const c = comments[i];
        if (c.pictures) fixPictures(c.pictures);
        const subs = c.sub_comments || [];
        for (let j = 0; j < subs.length; j++) {
          if (subs[j].pictures) fixPictures(subs[j].pictures);
        }
      }
      body = JSON.stringify(obj);
      console.log("[小红书] comment/list pictures fixed");
    } catch (e) {
      console.log("[小红书] comment/list: " + e);
    }
    return $done({ body });
  }

  // widgets
  if (/\/api\/sns\/v\d+\/note\/widgets(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      obj.data = {};
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("widgets: " + e);
    }
    return $done({ body });
  }

  // live_photo save
  if (/\/api\/sns\/v\d+\/note\/live_photo\/save(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      const stored = $.getdata($.RedBookPhotoKey);
      if (stored && obj.data) {
        obj.data.download_url = JSON.parse(stored);
      }
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("live_photo: " + e);
    }
    return $done({ body });
  }

  // video save
  if (/\/api\/sns\/v\d+\/note\/video\/save(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      let tmp = [];
      try {
        tmp = JSON.parse($.getdata($.RedBookVideoKey) || "[]");
      } catch (e) {
        tmp = [];
      }
      for (let i = 0; i < tmp.length; i++) {
        if (tmp[i].note_id == (obj.data && obj.data.note_id)) {
          obj.data = tmp[i];
          break;
        }
      }
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("video: " + e);
    }
    return $done({ body });
  }

  // redtube
  if (/\/api\/sns\/v\d+\/note\/redtube(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      const modules = (obj.data && obj.data.items) || obj.data || [];
      for (let i = 0; i < modules.length; i++) {
        const m = modules[i];
        if (m.related_goods_num) m.related_goods_num = 0;
        if (m.has_related_goods) m.has_related_goods = false;
        if (m.media_save_config) {
          m.media_save_config = {
            disable_save: false,
            disable_watermark: true,
            disable_weibo_cover: true,
          };
        }
        if (m.share_info) {
          m.share_info.function_entries = [
            { type: "generate_image" },
            { type: "copy_link" },
            { type: "native_voice" },
            { type: "video_download" },
            { type: "note_collection" },
            { type: "share_to_friends" },
            { type: "report" },
            { type: "dislike" },
          ];
        }
      }
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("redtube: " + e);
    }
    return $done({ body });
  }

  // tabfeed / videofeed
  if (/\/api\/sns\/v\d+\/note\/(?:tab|video)feed(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      let datas = [];
      try {
        datas = JSON.parse($.getdata($.RedBookVideoKey) || "[]");
      } catch (e) {
        datas = [];
      }
      const modules =
        (obj.data && obj.data.items) || obj.data || [];
      for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
        if (module.related_goods_num) module.related_goods_num = 0;
        if (module.has_related_goods) module.has_related_goods = false;
        if (module.media_save_config) {
          module.media_save_config = {
            disable_save: false,
            disable_watermark: true,
            disable_weibo_cover: true,
          };
        }
        if (module.share_info) {
          module.share_info.function_entries = [
            { type: "generate_image" },
            { type: "copy_link" },
            { type: "native_voice" },
            { type: "video_download" },
            { type: "note_collection" },
            { type: "share_to_friends" },
            { type: "report" },
            { type: "dislike" },
          ];
        }
        if (Array.isArray(module.image_list)) {
          module.image_list.forEach(function (img) {
            img.enable = true;
            delete img.reason;
          });
        }
        if (
          module.video_info_v2 &&
          module.video_info_v2.media &&
          module.video_info_v2.media.stream &&
          module.video_info_v2.media.stream.h264
        ) {
          const idata = {
            type: 2,
            note_id: module.id,
            download_url:
              module.video_info_v2.media.stream.h264[0].master_url,
          };
          datas.push(idata);
        }
      }
      while (datas.length > 100) datas.shift();
      $.setdata(JSON.stringify(datas), $.RedBookVideoKey);
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("videofeed: " + e);
    }
    return $done({ body });
  }

  // note/feed
  if (/\/api\/sns\/v\d+\/note\/feed(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      const modules = obj.data || [];
      for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
        if (module.related_goods_num) module.related_goods_num = 0;
        if (module.has_related_goods) module.has_related_goods = false;
        if (Array.isArray(module.image_list)) {
          module.image_list.forEach(function (img) {
            img.enable = true;
            delete img.reason;
          });
        }
        if (module.note_list) {
          for (let j = 0; j < module.note_list.length; j++) {
            module.note_list[j].media_save_config = {
              disable_save: false,
              disable_watermark: true,
              disable_weibo_cover: true,
            };
          }
        }
      }
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("feed: " + e);
    }
    return $done({ body });
  }

  // imagefeed
  if (/\/api\/sns\/v\d+\/note\/imagefeed(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      let datas = [];
      try {
        datas = JSON.parse($.getdata($.RedBookPhotoKey) || "[]");
      } catch (e) {
        datas = [];
      }
      const modules =
        (obj.data && obj.data.items) || obj.data || [];
      for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
        if (module.related_goods_num) module.related_goods_num = 0;
        if (module.has_related_goods) module.has_related_goods = false;
        if (module.note_list) {
          for (let j = 0; j < module.note_list.length; j++) {
            const item = module.note_list[j];
            item.media_save_config = {
              disable_save: false,
              disable_watermark: true,
              disable_weibo_cover: true,
            };
            if (item.images_list) {
              for (let k = 0; k < item.images_list.length; k++) {
                const it = item.images_list[k];
                if (it.live_photo) {
                  const idata = {
                    video_id:
                      it.live_photo.media &&
                      it.live_photo.media.video_id,
                    file_id: it.live_photo_file_id,
                    download_url:
                      it.live_photo.media &&
                      it.live_photo.media.stream &&
                      it.live_photo.media.stream.h265 &&
                      it.live_photo.media.stream.h265[0] &&
                      it.live_photo.media.stream.h265[0].master_url,
                  };
                  datas.push(idata);
                }
              }
            }
          }
        }
      }
      while (datas.length > 100) datas.shift();
      $.setdata(JSON.stringify(datas), $.RedBookPhotoKey);
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("imagefeed: " + e);
    }
    return $done({ body });
  }

  // categories
  if (/\/api\/sns\/v\d+\/homefeed\/categories(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      if (obj.data && Array.isArray(obj.data.categories)) {
        obj.data.categories = obj.data.categories.filter(function (c) {
          return !(
            c.oid === "homefeed.live" ||
            c.oid === "homefeed.sketch" ||
            c.oid === "homefeed.live"
          );
        });
      }
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("categories: " + e);
    }
    return $done({ body });
  }

  // search hint
  if (/\/api\/sns\/v\d+\/search\/hint(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      if (obj.data && obj.data.queries) {
        obj.data.queries = [
          {
            title: "搜索笔记",
            type: "firstEnterOther#itemCfRecWord#搜索笔记#1",
            search_word: "搜索笔记",
          },
        ];
      }
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("hint: " + e);
    }
    return $done({ body });
  }

  // search hot_list
  if (/\/api\/sns\/v\d+\/search\/hot_list(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      obj.data = {
        scene: "",
        title: "",
        items: [],
        host: "",
        background_color: {},
        word_request_id: "",
      };
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("hot_list: " + e);
    }
    return $done({ body });
  }

  // search trending
  if (/\/api\/sns\/v\d+\/search\/trending(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      obj.data = {
        title: "",
        queries: [],
        type: "",
        word_request_id: "",
      };
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("trending: " + e);
    }
    return $done({ body });
  }

  // splash_config
  if (/\/api\/sns\/v\d+\/system_service\/splash_config(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      const list =
        (obj.data && obj.data.datas) ||
        (obj.data && obj.data.splash_list) ||
        [];
      if (Array.isArray(list)) {
        list.forEach(function (item) {
          item.start_time = "2099-01-01";
          item.end_time = "2099-01-01";
          if (Array.isArray(item.ads)) {
            item.ads.forEach(function (ad) {
              ad.start_time = "2099-01-01";
              ad.end_time = "2099-01-01";
            });
          }
        });
      }
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("splash_config: " + e);
    }
    return $done({ body });
  }

  // system config
  if (/\/api\/sns\/v\d+\/system_service\/config(?:\?|$)/.test(url)) {
    try {
      const obj = JSON.parse(body);
      const props = [
        "store_splash",
        "splash",
        "loading_ad",
        "ads",
        "ad_config",
        "cny_config",
      ];
      if (obj.data) {
        for (let i = 0; i < props.length; i++) {
          if (obj.data[props[i]] !== undefined) delete obj.data[props[i]];
        }
        if (obj.data.user_config) delete obj.data.user_config;
      }
      body = JSON.stringify(obj);
    } catch (e) {
      console.log("config: " + e);
    }
    return $done({ body });
  }

  $done({ body });
}

// 精简 Env（兼容 Quantumult X / Surge / Shadowrocket）
function Env(name) {
  this.name = name;
  this.isQuanX = function () {
    return typeof $task !== "undefined";
  };
  this.isSurge = function () {
    return typeof $httpClient !== "undefined" && typeof $loon === "undefined";
  };
  this.isShadowrocket = function () {
    return typeof $rocket !== "undefined";
  };
  this.getdata = function (key) {
    if (this.isSurge() || this.isShadowrocket()) return $persistentStore.read(key);
    if (this.isQuanX()) return $prefs.valueForKey(key);
    return null;
  };
  this.setdata = function (val, key) {
    if (this.isSurge() || this.isShadowrocket()) return $persistentStore.write(val, key);
    if (this.isQuanX()) return $prefs.setValueForKey(val, key);
    return false;
  };
}
