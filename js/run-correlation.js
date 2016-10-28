function runCorrelation(){
  calculateCorrelation(params).then(function(corrResult){
    avgEvents(corrResult, params).then(function(avgResults) {
      _.each(corrResult, function(eventInfo, index){ // corr results
        _.each(avgResults, function(obj, didOrDidnt){ //avg results
          _.each(obj, function (avgCount, eventName) {
            if(eventName === eventInfo[0]){ // if the event names in both arrays match do stuff
              if(didOrDidnt === "didEvent"){
                corrResult[index][2] = avgCount
              }else if(didOrDidnt === "didNotDoEvent"){
                corrResult[index][3] = avgCount
              }
            }
          })
        })
      })
      //loop through the new array that has r coeffiecent, and event averages to calculate % change of users who did corr event and those who did not
      _.each(corrResult, function(values, index){
        var percentchange = parseFloat(((values[2]-values[3])/values[3]).toFixed(0))
        values[4] = typeof percentchange !== 'number' ? 0 : percentchange
      })

      var table = $('#correlation-table').DataTable({
          destroy: true,
          searching: true,
          paging: true,
          data: corrResult,
          "order": [[ 1, "desc" ]],
          "createdRow": function ( row, data, index ) {
            if ( data[1] <= 1 && data[1] >=.5 || data[1] >= -1 && data[1]<= -.05 ) {
                $('td', row).eq(1).addClass('green');
            }else if(data[1] <= .5 && data[1] >=.3 || data[1] >= -.5 && data[1]<= -.3 ){
                  $('td', row).eq(1).addClass('yellow');
            }else if(data[1] <= .3 && data[1] >=.1 || data[1] >= -.3 && data[1]<= -.1){
                  $('td', row).eq(1).addClass('orange');
            }else {
              $('td', row).eq(1).addClass('red');
            }
          }
      });
      //get data structure ready for scatter plot
      var scatterData = []
      _.each(corrResult, function(values){
        //debugger
        if(values[4] !== Infinity && (values[4] >= .1 || values[4] <= -.1)){
          var color, symbol
          if ( values[4] <= 1 && values[4] >=.5 || values[4] >= -1 && values[4]<= -.05 ) {
            color = 'green'
            symbol = "circle"
          }else if(values[4] <= .5 && values[4] >=.3 || values[4] >= -.5 && values[4]<= -.3 ){
            color = 'yellow'
            symbol = "square"
          }else if(values[4] <= .3 && values[4]>=.1 || values[4] >= -.3 && values[4]<= -.1){
            color = 'orange'
            symbol = "diamond"
          }else {
            color = 'red'
            symbol = "triangle"
          }
          //debugger
          scatterData.push({name: values[0], data:[[parseFloat(values[1]),parseFloat(values[4])]],color: color, marker:{symbol: symbol}})
        }
      })
      //graph the scatter parseFloat
      $(function(){
        $('#scatter').highcharts({
            chart: {
                type: 'scatter',
                zoomType: 'xy'
            },
            title: {
                text: 'Correlation and Event Behavior Difference'
            },
            subtitle: {
                text: ''
            },
            xAxis: {
                title: {
                    enabled: true,
                    text: 'r Coeffiecent'
                },
                startOnTick: true,
                endOnTick: true,
                showLastLabel: true
            },
            yAxis: {
                title: {
                    text: '% Diff those who did <b>'+params.correlationEvent+' and did not'
                }
            },
            legend: {
                enabled: false,
                layout: 'vertical',
                align: 'left',
                verticalAlign: 'top',
                x: 100,
                y: 70,
                floating: true,
                backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF',
                borderWidth: 1
            },
            plotOptions: {
                scatter: {
                    marker: {
                        radius: 5,
                        states: {
                            hover: {
                                enabled: true,
                                lineColor: 'rgb(100,100,100)'
                            }
                        }
                    },
                    states: {
                        hover: {
                            marker: {
                                enabled: false
                            }
                        }
                    },
                    tooltip: {
                        headerFormat: '<b>{series.name}</b><br>',
                        pointFormat: '{point.x} r Coeffiecent, {point.y} % Difference'
                    }
                }
            },
            series: scatterData
        });
      })

    }, function(error) {
        console.log("Error on average calculation - ",error)
    })
  }, function(error) {
    console.log("Error on Correlation Calculation - ",error)
  })
}
