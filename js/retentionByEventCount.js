function retentionByEventCountsQuery(){
  params.evetnsToExclude = ['$campaign_delivery','digest email sent','digest email opened','$campaign_bounced','$campaign_marked_spam','Anomaly Detected']
  MP.api.jql(function main() {
  return Events({
    from_date: params.start_date,
    to_date:   params.end_date
    //event_selectors: params.event_selectors
  })
  .filter(function(e){
    var test = false
    test = _.contains(params.eventsToExclude, e.name)
    if(!test){
      return e
    }
  })
  .groupByUser(function(acc, events){ // count the number of times each user did the selected events
    acc =  acc || {}
  //loop through the users events and see if they did the correlation event
  _.each(events, function(event, key){
    if(key === 0){
      acc.firstEvent = acc.firstEvent ? acc.firstEvent : event.time
    }
    //if they did save that date
    if(event.name === params.correlationEvent){
      acc.firstOccurance = acc.firstOccurance ? acc.firstOccurance : event.time
      //increment the number of times they did the correlation event in the time frame
      acc.countOfCorrelationEvent = acc.countOfCorrelationEvent ? acc.countOfCorrelationEvent + 1: 1
    }
    //continue to loop through events and find the date of their last event in the time frame and record the data
    acc.lastEventTime =  event.time
  })
  //calculate the number of days retained if they performed the event
  acc.daysRetained = parseInt(((acc.lastEventTime - acc.firstEvent) / 1000 / 60 / 60/ 24).toFixed(0))
  //calculate the number of days retained after doing the correlation event
  if(typeof acc.countOfCorrelationEvent != "number"){
    acc.daysRetainedAfterCorrEvent = "Did not perform correlation event"
  }else{
    acc.daysRetainedAfterCorrEvent = parseInt(((acc.lastEventTime - acc.firstOccurance) / 1000 / 60 / 60/ 24).toFixed(0))
  }
  //change the value of acc.daysRetained to a more human readable value if the user never performed the event in question
  if(isNaN(acc.daysRetained)){
    acc.daysRetained = "Not Retained"
  }
  if(acc.daysRetainedAfterCorrEvent !== "Did not perform correlation event" && isNaN(acc.daysRetainedAfterCorrEvent)){
    acc.daysRetainedAfterCorrEvent = "Not Retained After Correlation Event"
  }
  if(!acc.countOfCorrelationEvent){
    acc.countOfCorrelationEvent = 0
  }
  return acc
  })
  .groupBy(['value.countOfCorrelationEvent'],function(accs, items){
    var data = {}
    /*go through all the data and
    1) get a total count of people who did the correlation event and those who didn't
    */
    //set a bunch of objects to be used later
    data.totalUsers = items.length;
    data.didCorrelationEvent ={};
    data.didNotDoCorrelationEvent ={};
    data.didCorrelationEvent.totalDaysRetained ={};
    data.didNotDoCorrelationEvent.totalDaysRetained ={};
    // data.didCorrelationEvent.totalDaysRetained.totalCount ={};
    // data.didNotDoCorrelationEvent.totalDaysRetained.totalCount ={};
    // for(var a; a < 31; a++){
    //   data.didCorrelationEvent.totalDaysRetained[a] = 0
    //   data.didNotDoCorrelationEvent.totalDaysRetained[a] = 0
    // }
    _.each(items, function(item){
      //if the user did the correlation event start to do things
      if(item.value.countOfCorrelationEvent !== 0){
        //count up the total number of users in this bucket for later calculation
        data.didCorrelationEvent.totalDaysRetained.totalCount = data.didCorrelationEvent.totalDaysRetained.totalCount ? data.didCorrelationEvent.totalDaysRetained.totalCount +1 : 1
        //for this particular user add to each day they were retained in the timeframe of the query
        for (var i=0; i < item.value.daysRetained; i++){
          data.didCorrelationEvent.totalDaysRetained[i] = data.didCorrelationEvent.totalDaysRetained[i] ? data.didCorrelationEvent.totalDaysRetained[i] + 1 : 1
        }
        // if they did not do the correlation event group in other bucket
      }else{
        //count up the total number of users in this bucket for later calculation
        data.didNotDoCorrelationEvent.totalDaysRetained.totalCount = data.didNotDoCorrelationEvent.totalDaysRetained.totalCount ? data.didNotDoCorrelationEvent.totalDaysRetained.totalCount +1 : 1
        //for this particular user add to each day they were retained in the timeframe of the query
        if(typeof item.value.daysRetained === 'number'){
          for (var x=0; x <= item.value.daysRetained; x++){
          data.didNotDoCorrelationEvent.totalDaysRetained[x] = data.didNotDoCorrelationEvent.totalDaysRetained[x] ? data.didNotDoCorrelationEvent.totalDaysRetained[x] + 1 : 1
          }
        }
      }
    })
    _.each(accs, function(acc){
      data.totalUsers += acc.totalUsers
      //count up the total number of people who did do the correlation event in the accumulators
      data.didCorrelationEvent.totalDaysRetained.totalCount =  data.didCorrelationEvent.totalDaysRetained.totalCount ?  data.didCorrelationEvent.totalDaysRetained.totalCount + acc.didCorrelationEvent.totalDaysRetained.totalCount : acc.didCorrelationEvent.totalDaysRetained.totalCount
      //count up the total number of people who did NOT do the correlation event in the accumulators
      data.didNotDoCorrelationEvent.totalDaysRetained.totalCount = data.didNotDoCorrelationEvent.totalDaysRetained.totalCount ? data.didNotDoCorrelationEvent.totalDaysRetained.totalCount + acc.didNotDoCorrelationEvent.totalDaysRetained.totalCount : acc.didNotDoCorrelationEvent.totalDaysRetained.totalCount
      //make sure to add up all the users for each day after that they are retained by bucket
      for (var i=0; i < 31; i++){
        data.didCorrelationEvent.totalDaysRetained[i] = data.didCorrelationEvent.totalDaysRetained[i] ? data.didCorrelationEvent.totalDaysRetained[i] + acc.didCorrelationEvent.totalDaysRetained[i] : acc.didCorrelationEvent.totalDaysRetained[i]
        data.didNotDoCorrelationEvent.totalDaysRetained[i] = data.didNotDoCorrelationEvent.totalDaysRetained[i] ? data.didNotDoCorrelationEvent.totalDaysRetained[i] + acc.didNotDoCorrelationEvent.totalDaysRetained[i] : acc.didNotDoCorrelationEvent.totalDaysRetained[i]
      }
    })
    return data
  })
},params).done(function(results){
    console.log(results);
    //bounds must be a list with a lower and upper bound
    function  bucketResults(queryResults, bounds){
      var tranformation = []
      var index = 0
      //loop into the data that we want
      _.each(results, function(obj){
        _.each(obj, function(keyValueObj, keyValueProperties){
          //if the nymber of times a user did the event is greater than the current upper bounds we have set increment up the index by 1
          if(keyValueObj[0] > bounds[index]){
            index++
          }
          tranformation[index] = tranformation[index] ? tranformation[index] : tranformation[index] ={}
          //create the eventual final structure we need for graphing
          tranformation[index].data = tranformation[index].data ? tranformation[index].data : tranformation[index].data = []
          //if the number of times a user did the event is between the current bounds create the data object that we need for graphing in highcharts
          //debugger
          if(keyValueObj[0] <= 10){
            tranformation[index] = {name : bounds[index]}
          }else if(keyValueObj[0] >= bounds[index] && keyValueObj[0] < bounds[index+1]){
            //will be grouping by number bounds
            tranformation[index] = {name : bounds[index] + "-" + (bounds[index+1]-1)}
            //loop into the grouped users counts and add up all the values that fall in the specific bounds
            if(keyValueObj[0]> 38){
            }
          }else if(keyValueObj[0] >= bounds[bounds.length -1]){
            //will be grouping by number bounds, this is for anything beyond the higest bound
            tranformation[index] = {name : bounds[bounds.length-1] + "+"}
          }
          if(keyValueProperties === 'value'){
            _.each(keyValueObj.didCorrelationEvent.totalDaysRetained, function(counts, day){
              tranformation[index].data[day] = tranformation[index].data[day] ? tranformation[index].data[day] + counts: counts
            })
          }
        })
      })
      return tranformation
    }
    var placeholder = bucketResults(results, [1,2,3,4,6,7,8,9,10,11,20,30,40,50])
    console.log('placeholder',placeholder);
    var graphData = bucketResultsToPercentage(placeholder)
    graphLineChart('bucket-retention', 'Retention by Event Frequency of <b>'+params.correlationEvent+'</b>', 'Number of Users', 'Days Retained', '%', graphData)
  })
}
