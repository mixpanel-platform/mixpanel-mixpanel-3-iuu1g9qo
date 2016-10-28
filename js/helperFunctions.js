function graphLineChart(containerTarget, title, yAxis, xAxis, toolTipSuffix, data){
  //transform the data object to pull out the "days" or categories in this case
  var categories = []
  _.each(data, function(obj){
    _.each(obj.data, function(values, index){
      var xValue = 'Day ' + index
      categories[index] = xValue.toString()
    })
  })
  //graph the info
  $('#'+containerTarget).highcharts({
      title: {
          text: title,
          x: -20 //center
      },
      xAxis: {
          categories: categories,
          title: {
              text: xAxis
          },
          tickAmount: categories.length -1
      },
      yAxis: {
          title: {
              text: yAxis
          }
          // plotLines: [{
          //     value: 0,
          //     width: 1,
          //     color: '#808080'
          // }]
      },
      tooltip: {
          valueSuffix: toolTipSuffix
      },
      legend: {
          layout: 'vertical',
          align: 'right',
          verticalAlign: 'middle',
          borderWidth: 0
      },
      series: data
      // [{
      //     name: 'Tokyo',
      //     data: [7.0, 6.9, 9.5, 14.5, 18.2, 21.5, 25.2, 26.5, 23.3, 18.3, 13.9, 9.6]
      // }, {
      //     name: 'New York',
      //     data: [-0.2, 0.8, 5.7, 11.3, 17.0, 22.0, 24.8, 24.1, 20.1, 14.1, 8.6, 2.5]
      // }, {
      //     name: 'Berlin',
      //     data: [-0.9, 0.6, 3.5, 8.4, 13.5, 17.0, 18.6, 17.9, 14.3, 9.0, 3.9, 1.0]
      // }, {
      //     name: 'London',
      //     data: [3.9, 4.2, 5.7, 8.5, 11.9, 15.2, 17.0, 16.6, 14.2, 10.3, 6.6, 4.8]
      // }]
  });
}

function transformDataforOverallRetention(dataResults){
  data =[]
  data[0] = {data:[0],name:'Did '+ params.correlationEvent}
  data[1] = {data:[0],name:'Did Not Do '+ params.correlationEvent}
  // data[0] = {}
  // data[1] = {}
  /*************

  Reminder index 0 is the same day i.e. within 24 hours, index 1 equals one day later, index 2 two day retention, etc

  ********/
  _.each(dataResults[0], function(object, key) {
    _.each(object.totalDaysRetained, function(values, days){
      var totalCount = object.totalDaysRetained.totalCount
      if(days !=='totalCount'){
        if(key ==='didCorrelationEvent'){
          if(values !== null || values !== undefined){
            data[0].data[parseInt(days)] = parseFloat((values / totalCount).toFixed(2)) * 100
          }else{
            data[0].data[parseInt(days)] = 0
          }
        }else if (key === 'didNotDoCorrelationEvent') {
          if(values !== null){
            data[1].data[parseInt(days)] = parseFloat((values / totalCount).toFixed(2)) * 100
          }else{
            data[1].data[parseInt(days)] = 0 / totalCount
          }
        }
      }
      // else{
      //   if(key ==='didCorrelationEvent'){
      //     if(values !== null || values !== undefined){
      //       data[0].data[parseInt(days)+1] = values / totalCount
      //     }else{
      //       data[0].data[parseInt(days)+1] = 0
      //     }
      //   }else if (key === 'didNotDoCorrelationEvent') {
      //     if(values !== null){
      //       data[1].data[parseInt(days)+1] = values / totalCount
      //     }else{
      //       data[1].data[parseInt(days)+1] = 0
      //     }
      //   }
      // }
    })
  })
  return data
}

function bucketResultsToPercentage(dataToTransform) {
  _.each(dataToTransform, function(objs){
    _.each(objs.data, function(counts, index){
      objs.data[index] = parseFloat((objs.data[index] / objs.data.totalCount).toFixed(2)) * 100
    })
  })
  return dataToTransform
}
function bucketResultsToPercentage(dataToTransform) {
  _.each(dataToTransform, function(objs){
    _.each(objs.data, function(counts, index){
      objs.data[index] = parseFloat((objs.data[index] / objs.data.totalCount).toFixed(2)) * 100
    })
  })
  return dataToTransform
}
