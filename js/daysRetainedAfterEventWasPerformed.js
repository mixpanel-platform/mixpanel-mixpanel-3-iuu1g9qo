params.evetnsToExclude = ['$campaign_delivery','digest email sent','digest email opened','$campaign_bounced','$campaign_marked_spam','Anomaly Detected']
function retentionAfterEvent(){
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
    }if(acc.daysRetainedAfterCorrEvent !== "Did not perform correlation event" && isNaN(acc.daysRetainedAfterCorrEvent)){
      acc.daysRetainedAfterCorrEvent = "Not Retained After Correlation Event"
    }
    return acc
    })

    //.filter(e => e.value.firstOccurance)
    .reduce(function(accs, items){
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
      _.each(items, function(item){
        //if the user did the correlation event start to do things
        if(item.value.countOfCorrelationEvent){
          //count up the total number of users in this bucket for later calculation
          data.didCorrelationEvent.totalDaysRetained.totalCount = data.didCorrelationEvent.totalDaysRetained.totalCount ? data.didCorrelationEvent.totalDaysRetained.totalCount +1 : 1
          //for this particular user add to each day they were retained in the timeframe of the query
          for (var i=0; i < item.value.daysRetainedAfterCorrEvent; i++){
            data.didCorrelationEvent.totalDaysRetained[i] = data.didCorrelationEvent.totalDaysRetained[i] ? data.didCorrelationEvent.totalDaysRetained[i] + 1 : 1
          }
          // if they did not do the correlation event group in other bucket
        }else{
          //count up the total number of users in this bucket for later calculation
          data.didNotDoCorrelationEvent.totalDaysRetained.totalCount = data.didNotDoCorrelationEvent.totalDaysRetained.totalCount ? data.didNotDoCorrelationEvent.totalDaysRetained.totalCount +1 : 1
          //for this particular user add to each day they were retained in the timeframe of the query
          if(typeof item.value.daysRetainedAfterCorrEvent === 'number'){
            for (var x=0; x <= item.value.daysRetainedAfterCorrEvent; x++){
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
    console.log('days after event retention',results);
    var graphData = transformDataforOverallRetention(results)
    //graph highcharts chart
    graphLineChart("days-after-retention", "Unbounded Retention After <b>"+params.correlationEvent+"</b> Was Performed", "Percet of User Retained", "Day's Retained" ,"%",graphData)
  })
}
