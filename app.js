var userMetrics = new UserMetrics({
    url: '/user_metrics.json'
});

$.LoadingOverlay("show");
userMetrics.fetchData()
    .then(function(data) {
        userMetrics.data = data;
        return userMetrics
    })
    .then(function(userMetrics) {
      $.LoadingOverlay("hide");

      var data = userMetrics.data.metrics

      var dataBySDK = userMetrics.groupBySDK(data);
      var dataSDKMetrics = userMetrics.getSDKMetrics(dataBySDK);
      var dataSDKCounts = userMetrics.getSDKCounts(dataSDKMetrics);


      /* Browser Metrics wrt OS */
      var dataBrowserOSMetrics = userMetrics.getBrowserOSMetrics(dataBySDK['JavaScript']);
      var dataBrowserOSMetricsCounts = userMetrics.getOSCounts(dataBrowserOSMetrics);
      
      /* Xamarin Metrics */
      var dataXamarinOSMetrics = userMetrics.getOSMetrics(dataBySDK['xamarin']);
      var dataXamarinOSCounts = userMetrics.getOSCounts(dataXamarinOSMetrics);

      /* Browser Metrics wrt Version */
      var dataBrowserMetrics = userMetrics.getBrowserMetrics(dataBySDK['JavaScript']);
      var dataBrowserMetricsCounts = userMetrics.getBrowserCounts(dataBrowserMetrics);


      /* Render SDK Pie Charts */
        var sdkData = [];
        for(var i in dataSDKCounts){
          sdkData.push({name:i,y:dataSDKCounts[i]})
        }

        renderPie(
          '#container-sdk',
          sdkData,
          null,
          {title:'SDK Data', subtitle: 'SDK Data Visualization'}
        );

      //Render Xamarin Pie
        renderDrillPie(
          '#container-xamarin',
          dataXamarinOSCounts, 
          dataXamarinOSMetrics,
          {title:'Mobile Data Break-up', subtitle: 'Xamarin SDK for Android and iOS'}
        );

      //Render JS Pie
        renderDrillPie(
          '#container-javascript',
          dataBrowserOSMetricsCounts,
          dataBrowserOSMetrics,
          {title:'JavaScript/OS Data Break-up', subtitle: 'JS SDK for OS and Browser'}
        );

      //Render Browser Pie
        renderDrillPie(
          '#container-browser',
          dataBrowserMetricsCounts,
          dataBrowserMetrics,
          {title:'Browser Data Break-up', subtitle: 'Browser version break-up'}
        );
    });

//Wrapper for Drill Data
function renderDrillPie(divId, dataCounts, dataMetrics, options){
  /* Render Xamarin Pie Charts */
        var data=[];
        for(var i in dataCounts){
          data.push({
            "name":i,
            "y":dataCounts[i],
            "drilldown":i
          })
        }

        var drillData = [];
        for(var j in dataMetrics){
          var drilldown = []
          for(var i in dataMetrics[j]){
            drilldown.push([i,dataMetrics[j][i]])
          }
          drillData.push({
            "name":j,
            "id":j,
            "data":drilldown
          })
        }
        renderPie(
          divId,
          data,
          drillData,
          options
        );
}

//Render Mobile Charts
function renderPie(divId, data, drilldown, options){
  $(function () {
      // Create the chart
      $(divId).highcharts({
          chart: {
              type: 'pie'
          },
          title: {
              text: options.title
          },
          subtitle: {
              text: options.subtitle
          },
          plotOptions: {
              series: {
                  dataLabels: {
                      enabled: true,
                      format: '{point.name}: {point.y:.0f} counts'
                  }
              }
          },

          tooltip: {
              headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
              pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y:.0f} counts</b><br/>'
          },
          series: [{
              name: "Data",
              colorByPoint: true,
              data: data
          }],
          drilldown: {
              series: drilldown
          }
      });
  });
} 