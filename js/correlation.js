function calculateCorrelation(params){
  return new Promise(function(resolve, reject){
    //global variable for results
    var finalData = []
    //get the top events for the event correlation
    var topEventParams = {
      type: 'general',  // analysis type for the data, can be 'general', 'unique', or 'average'
      limit: 100         // maximum number of results to return
    };
    var topEvents = []
    MP.api.topEvents(topEventParams).done(function(results) {
      _.each(results.values(), function (events) {
        topEvents.push(events)
      })
      //global vars
      //global correlation object
      var correlation = {}
      //set the top events to analyze against
      params.eventsArray = topEvents
      var event_selectors = []
      _.each(params.eventsArray, function(e) {
        event_selectors.push({event: e});
      })
      //does the top events list contain the event we want to do the correlation event against? if it doesn't make sure ot add to our eventsArray
      var doesContain = _.contains(params.eventsArray, params.correlationEvent)
      if(doesContain === false){
        event_selectors.push({event: params.correlationEvent})
      }
      params.event_selectors = event_selectors
      //get the event counts/sums
      MP.api.jql(function main() {
        return Events({
          from_date: params.start_date,
          to_date:   params.end_date,
          event_selectors: params.event_selectors
        })
        .groupBy(['name'],mixpanel.reducer.count())
        },params
      ).done(function(eventCounts){
        //count users
        MP.api.jql(function main() {
          return Events({
            from_date: params.start_date,
            to_date:   params.end_date,
            event_selectors: params.event_selectors
            //event selectors are not included since we need to count the total number of user, not just users who did the event in case they aren't caputured in the top events
          })
          .groupByUser(mixpanel.reducer.count())
          .reduce(mixpanel.reducer.count())
        },params
        ).done(function (userCountResults) {
          //run jql queries to get the squred sum of each event, and the sum of the correlation event times all other events
          MP.api.jql(function main() {
            return Events({
              from_date: params.start_date,
              to_date:   params.end_date,
              event_selectors: params.event_selectors
            })
            .groupByUser(function(acc, events){
              acc =  acc || {}
              _.each(events, function(event){
                acc[event.name] = acc[event.name] ? acc[event.name] +1 : acc[event.name] =1
              })
              _.each(params.eventsArray, function(eventName){
                acc[eventName] = acc[eventName] ? acc[eventName] : acc[eventName] = 0
              })
              return acc
            })
            // X  is equal to the correlation event and Y is equal to any other event we are comparing to
            .reduce(function(accs, items){
              //create the data variable
              var data = {}
              //add additional objects to store the xtimesy and event squared values for each event
              data.xTimesYSummed ={}
              data.squaredSums = {}
              //create a variable to hold the value of the users correlation value
              var correlationEventValue
              _.each(items, function(user, item){// loop through the items collection
                _.each(user.value, function(count, eventName){ //loop through each users event collection to find the correlation event before doing any operation on other events. Need this value to calculate xTimesY properly
                  if(eventName === params.correlationEvent){
                    correlationEventValue = count
                  }
                 })
                _.each(user.value, function(count, eventName){ //loop through each users event collection
                  //for each event calculate X times Y (Y being the event we are calculating correlation for X being the the other events in the users profile)
                  data.xTimesYSummed[eventName] = data.xTimesYSummed[eventName] ? data.xTimesYSummed[eventName] + (count * correlationEventValue)  : (count * correlationEventValue)
                  //for each event calculate X squared (X being the the other events in the users profile)
                  data.squaredSums[eventName] = data.squaredSums[eventName] ? data.squaredSums[eventName] + (count * count)  : (count * count)
                })
              })
              _.each(accs, function(accumulator, key){ // loop through the accumulator collection
                _.each(accumulator.xTimesYSummed, function(value, event){ // loop into the data object that was created above
                  //add the accs values to the new data object so that it can be returned
                  data.xTimesYSummed[event] =  data.xTimesYSummed[event] ?  data.xTimesYSummed[event]  + value : value
                })
              })
              _.each(accs, function(accumulator, key){ // loop through the accumulator collection
                _.each(accumulator.squaredSums, function(value, event){ // loop into the previous accumlator values
                  data.squaredSums[event] =  data.squaredSums[event] ?  data.squaredSums[event] + value : value //add the previously accumulated values to the data object before returning we can can get the total sums for each calculation events
                })
              })
              return data
            })
          },params
          ).done(function (mathResults) {
            //take all the JQL queries and combine all the different values on each event for easier manipulation later
            var combinedDataObj = {}
            _.each(topEvents, function(eventName){ //loop through all the events to create the new data object
              _.each(eventCounts, function(eventObject) {// loop through the event counts and add those counts to the new object
                if(eventName === eventObject.key[0]){
                  combinedDataObj[eventName] = {squaredSums:0,xTimesYSummed:0 }
                  combinedDataObj[eventName].totalCount = eventObject.value
                }
              })
              _.each(mathResults[0].squaredSums,function(value,key){
                if(eventName === key){
                  combinedDataObj[eventName].squaredSums = value
                }
              })
              _.each(mathResults[0].xTimesYSummed,function(value,key){
                if(eventName === key){
                  combinedDataObj[eventName].xTimesYSummed = value
                }
              })
            })
            _.each(combinedDataObj, function (values, eventName) {
              var userTimesXTimesYSummed = userCountResults[0]*values.xTimesYSummed
              var sumOfXtimesSumOfY = values.totalCount*combinedDataObj[params.correlationEvent].totalCount
              var squareRootofUsersTimesSumOfXSquaredMinusXSummedSquared = Math.sqrt((userCountResults[0]*values.squaredSums)-(values.totalCount*values.totalCount))
              var squareRootofUsersTimesSumOfYSquaredMinusYSummedSquared = Math.sqrt((userCountResults[0]*combinedDataObj[params.correlationEvent].squaredSums)-(combinedDataObj[params.correlationEvent].totalCount*combinedDataObj[params.correlationEvent].totalCount))
              correlation[eventName] = ((userTimesXTimesYSummed - sumOfXtimesSumOfY) / (squareRootofUsersTimesSumOfXSquaredMinusXSummedSquared * squareRootofUsersTimesSumOfYSquaredMinusYSummedSquared)).toFixed(3)
            })
            //make the object an array so we can sort from highest to lowest
            var correlationArray = _.pairs(correlation)
            //sort from highest to lowest
            var sortedCorrelation = correlationArray.sort(
              function(a, b) {
                  return a[1] - b[1]
            }).reverse()
            //****** if I want to cut down on the number of results to return uncomment lines 142- 147
            // for (var i = (sortedCorrelation.length - 10); i < sortedCorrelation.length; i++) {
            //   finalData.push(sortedCorrelation[i])
            // }
            // for (var i = 9; i >= 0 ; i--) {
            //   finalData.unshift(sortedCorrelation[i])
            // }
            var averageEvents ={}
            _.each(combinedDataObj, function(values, eventNames){
              //loop through our final data object to only create averages for events that high and low correlation
              // _.each(finalData, function (eventData) {
              //   //if an event is in our finalData var then create an average event count for that event
              //   if(eventData[0] === eventNames){
                  averageEvents[eventNames] =  (values.totalCount/userCountResults[0]).toFixed(3)
                // }
              // })

            })
            if(sortedCorrelation){
              resolve(sortedCorrelation);
            }else{
              reject("correlation error, please check that selected events have values");
            }
          })
        })
      })
    });
    //get the top 10 highest correlated events and the most negatively correlated events
    //as a note wer are going to use these benchmarks for what is strong and weak correlation later:
    // Value of r	Strength of relationship
    // -1.0 to -0.5 or 1.0 to 0.5	Strong
    // -0.5 to -0.3 or 0.3 to 0.5	Moderate
    // -0.3 to -0.1 or 0.1 to 0.3	Weak
    // -0.1 to 0.1	None or very weak
  })
}
