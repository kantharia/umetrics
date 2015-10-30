/**
 * Config
 * ======
 * 1) androidAlias     : list of different android-os name we group it under one name `Android`.
 * 
 * 2) iOSAlias         : list of different iOS names (exp. iOS, iPhone OS).
 *                       We group it under one name `iPhone OS`.
 *                       
 * 3) blacklisted      : Sometimes we get improper values for browser name on a particular plaform.
 *                       So we have black-listed those browser on that platform. 
 *                       Example : {'ios':['Webkit']} 
 *                       We have blacklisted `Webkit` browser on `ios`.
 *                       
 * 4) replaceBrowser   : This will replace browser on specific platfrom.
 * 
 * 5) browserDefaultOS : In some cases `blt_os` property is not present.
 *                       So we make a assumption wrt Browser. For example 
 *                       for `safari` browser we set `blt_os` to `ios`. 
 */
var config = {
  androidAlias : ["Android 22","Android 23","IceCreamSandwichMr1",
                  "JellyBean","JellyBeanMr1","JellyBeanMr2","Kitkat",
                  "L","Lollipop","LollipopMr1"],
  iOSAlias : ["iOS"],
  blacklisted : {
    'ios' : ['WebKit'],
    'macintosh' : ['nodejs'],
    'windows' : ['nodejs'],
    'linux' : ['nodejs']
  },
  replaceBrowser : {
    'android' : [{
      from : 'Mobile Safari',
      to : 'Chrome'
    }],
    'blackberry' : [{
      from : 'Mobile Safari',
      to : 'Chrome'
    }]
  },
  browserDefaultOS:{
    'safari' : 'ios',
    'chrome' : 'windows'
  }
}

/***
* Check for blacklisted browser
*/
function isBrowserBlacklisted(platform_info){

  //Check if OS info available in platform info
  if(platform_info && platform_info.blt_os){
    var os = platform_info.blt_os.toLowerCase();
  }

  if(config.blacklisted[os] && platform_info.blt_device){
    for(var i = 0; i < config.blacklisted[os].length; i++){
      var browser = config.blacklisted[os][i];
      if(platform_info.blt_device.match(browser)){
        return true
      }
    }
  }

  //if `blt_device` is not set
  if(!platform_info.blt_device){
    return true;
  }
}

/***
* UserMetrics
*/
var UserMetrics = function(config){
  this.data = [];
  this.url  = config.url;
}

//Fetch Data From URL
UserMetrics.prototype.fetchData = function(){
  var that = this;
  return new Promise(function(resolve, reject){
    var xhr = new XMLHttpRequest();
        xhr.open('GET', that.url);
        xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
        xhr.setRequestHeader('Access-Control-Allow-Methods', 'GET');
        xhr.send();

    xhr.onreadystatechange = function(){
      if(xhr.readyState == 4 && xhr.status == 200){
        resolve(JSON.parse(xhr.responseText));
      }
    }
  })
}

// Split Data from SDK
UserMetrics.prototype.groupBySDK = function(metrics){
  var _data = {};
  metrics
    .map(function(data){
      data.sdk.forEach(function(sdk){
        _data[sdk.blt_sdk] ? _data[sdk.blt_sdk].push(data) : _data[sdk.blt_sdk] = [data]
      })
    })
  return _data;
}

//Get SDK Metrics
UserMetrics.prototype.getSDKMetrics = function(metrics){
  var _data = {};
  Object.keys(metrics).map(function(key){
    _data[key] = {};
    metrics[key].map(function(metric){

      //Remove blacklisted
      if(isBrowserBlacklisted(metric.platform_info)){
        return;
      }

      return metric.sdk.map(function(sdk){
        _data[key][sdk.blt_sdk_version] = 
          _data[key][sdk.blt_sdk_version] ? _data[key][sdk.blt_sdk_version] + sdk.count : sdk.count
      })
    })
  });

  return _data;
}

//Get SDK Count from Metrics
UserMetrics.prototype.getSDKCounts = function(sdkMetrics){
  var _temp = {};
  var _data = {};
  for(sdk in sdkMetrics){
    _temp[sdk] = [];
    for(version in sdkMetrics[sdk]){
      _temp[sdk].push(sdkMetrics[sdk][version])
    }
  }

  for(sdk in _temp){
    _data[sdk] = _temp[sdk].reduce(function(prev, curr){return prev+curr});
  }

  return _data;
}

//Get Browser Metrics
UserMetrics.prototype.getBrowserMetrics = function(metrics){
  var _data = {};
  metrics.map(function(metric){

    var blt_device = metric.platform_info.blt_device ? metric.platform_info.blt_device.split("|") : false;
    
    //patch: In some cases `blt_device` is not set
    var browser = blt_device && blt_device[blt_device.length-2] ? blt_device[blt_device.length-2] : blt_device[blt_device.length-1] || 'Unknown';

    // Patch: Android OS doesnt have Mobile Safari Browser (Issue: http://bmp.io/ecz374z)
    if(config.replaceBrowser[metric.platform_info.blt_os]){
      config.replaceBrowser[metric.platform_info.blt_os].forEach(function(_browser){
        if(browser === _browser.from){
          browser = _browser.to
        }
      })
    }

    var browserVersion = blt_device && blt_device[blt_device.length-2] ? blt_device[blt_device.length-1] : 'Unknown';
        browserVersion = browserVersion.split('.')
        browserVersion = browserVersion[0] !== 'Unknown' ? [browserVersion[0],browserVersion[1]].join('.') : 'Unknown';

        // Remove unwanted browser from listing
        if(isBrowserBlacklisted(metric.platform_info)){
          return;
        }

      _data[browser]=_data[browser]||{};
      _data[browser][browserVersion] = _data[browser][browserVersion] ? _data[browser][browserVersion] + metric.platform_info.count : metric.platform_info.count;
  })
  return _data;
}

//Fetch browser count from browserMetrics
UserMetrics.prototype.getBrowserCounts = function(browserMetrics){
  var _temp={};
  var _data={};
  for(browser in browserMetrics){
    _temp[browser] = [];
    for(version in browserMetrics[browser]){
      _temp[browser].push(browserMetrics[browser][version])
    }
  }
  for(browser in _temp){
    _data[browser] = _temp[browser].reduce(function(prev, curr){return prev+curr});
  }
  return _data;
}

//
UserMetrics.prototype.getOSMetrics = function(metrics){
  var _temp = {};
  var _data = {};
  metrics.map(function(metric){
    /*
      Group all anroid version under one name
    */
    if(config.androidAlias.indexOf(metric.platform_info.blt_os) !== -1){
      metric.platform_info.blt_os = "Android"
    }

    /*
      Group all iPhone Version under one name
    */
    if(config.iOSAlias.indexOf(metric.platform_info.blt_os) !== -1){
      metric.platform_info.blt_os = "iPhone OS"
    }

    _temp[metric.platform_info.blt_os] = _temp[metric.platform_info.blt_os] || [];
      _temp[metric.platform_info.blt_os].push(metric.platform_info)
  })

  for(var os in _temp){
    _data[os] = {};
    _temp[os].forEach(function(d){
      _data[os][d.blt_os_version] = _data[os][d.blt_os_version] ? _data[os][d.blt_os_version] + d.count : d.count    
    })
  }
  return _data;
}

//Get OS Counts
UserMetrics.prototype.getOSCounts = function(osMetrics){
  var _data = {};
  Object.keys(osMetrics).map(function(os){
    _data[os] = 0;
    for(var version in osMetrics[os]){
      _data[os] += osMetrics[os][version]
    }
  })
  return _data
}

UserMetrics.prototype.getBrowserOSMetrics = function(metrics){
  var _data = {}
  var _data2 = {}

  metrics.map(function(m){
    if(m.platform_info && m.platform_info.blt_os) {
      m.platform_info.blt_os = m.platform_info.blt_os.toLowerCase();
    } else {
      //if os is not present set 'unknow'
      //m.platform_info.blt_os = 'unknown';
      console.log('Undefined', m, m.platform_info);

      /**
       * Patch: If `blt_os` is not defined the we will try to get it from blt_device
       * we will check for browser and assign default os.
       */
      var blt_device = m.platform_info.blt_device;
      var isBrowser = blt_device.match(/(browser)/ig);
          isBrowser = isBrowser && isBrowser.length;

      if(isBrowser){
        console.log('Found a browser', m.sdk[0].blt_sdk, blt_device.split('|')[1].toLowerCase() );
        var browserName = undefined;
        //Loop and find default os from browser
        Object.keys(config.browserDefaultOS).forEach(function(browser){
          browserName = blt_device.match( new RegExp(browser, 'gi') );
          if(browserName){
            //get first value from browser
            browserName = browserName[0].toLowerCase();
            //assign default os wrt browser
            m.platform_info.blt_os = config.browserDefaultOS[browserName]
          }
        })
      }
    }


    _data[m.platform_info.blt_os] = _data[m.platform_info.blt_os] || [];
    _data[m.platform_info.blt_os].push(m) 
  })

  for(var os in _data){
    _data2[os] = this.getBrowserCounts( this.getBrowserMetrics(_data[os]) );
  }

  //Filter data - remove empty object
  _data = {}
  for(var os in _data2){
    if(!!Object.keys(_data2[os]).length){
      _data[os] = _data2[os]
    }
  }

  return _data;
}