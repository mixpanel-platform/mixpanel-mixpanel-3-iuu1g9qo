//function that looks avg number of times an event was done for those who did the "correlation event" (event of interest), verses those how did not
function avgEvents(corrEvents, params){
  //create and set up event selectorss for the jql query to optimize analysis
  return new Promise(function(resolve, reject){
    var dataResults = {}
    var event_selectors = []
    var didNotDoEventAvgs = {}
    var didEventAvgs = {}
    _.each(corrEvents, function(eventObj, index){
      event_selectors.push({event:eventObj[0]})
    })
    MP.api.jql(function main() {
      return Events({
        from_date: params.start_date,
        to_date:   params.end_date,
        event_selectors: params.event_selectors
      })
      .groupByUser(function(acc, events){ // count the number of times each user did the selected events
        acc =  acc || {}
        _.each(events, function(event){
          acc[event.name] = acc[event.name] ? acc[event.name] +1 : acc[event.name] =1
        })
        _.each(params.eventsArray, function(eventName){
          acc[eventName] = acc[eventName] ? acc[eventName] : acc[eventName] = 0
        })
        return acc
      })
      //filter out users who did not do the correlation event
      .filter(item => item.value[params.correlationEvent] >=1)
      //add up all event counts and get a count of total users
      //.reduce(mixpanel.reducer.count())
      .reduce(function(acc, item){
        var data = {}
        data.userCount = 0
        data.events = {}
        _.each(item, function(items){ // loop through each collection of items
          data.userCount++
          _.each(items.value, function(eventsCount, eventName){ // look through the event counts of each individual item
            data.events[eventName] = data.events[eventName] ? data.events[eventName] + eventsCount : eventsCount
          })
        })
        _.each(acc, function(accs, key){
          _.each(accs.events, function(eventsCount, eventName){
            data.events[eventName] = data.events[eventName] ? data.events[eventName] + eventsCount : eventsCount
          })
          data.userCount += accs.userCount
        })
        return data
      })
    },params
    ).done(function(didEventResults){
      //loop through all the returned data and calculate average number of times a person did the events if they did the "correlation event we are interested in"
      _.each(didEventResults, function(data){
        _.each(data.events, function(count, eventName){
          didEventAvgs[eventName] = parseFloat((count/data.userCount).toFixed(3))
        })
      })
      MP.api.jql(function main() {
        return Events({
          from_date: params.start_date,
          to_date:   params.end_date,
          event_selectors: params.event_selectors
        })
        .groupByUser(function(acc, events){ // count the number of times each user did the selected events
          acc =  acc || {}
          _.each(events, function(event){
            acc[event.name] = acc[event.name] ? acc[event.name] +1 : acc[event.name] =1
          })
          _.each(params.eventsArray, function(eventName){
            acc[eventName] = acc[eventName] ? acc[eventName] : acc[eventName] = 0
          })
          return acc
        })
        //filter out users who did not do the correlation event
        .filter(item => item.value[params.correlationEvent] <=0)
        //add up all event counts and get a count of total users
        //.reduce(mixpanel.reducer.count())
        .reduce(function(acc, item){
          var data = {}
          data.userCount = 0
          data.events = {}
          _.each(item, function(items){ // loop through each collection of items
            data.userCount++
            _.each(items.value, function(eventsCount, eventName){ // look through the event counts of each individual item
              data.events[eventName] = data.events[eventName] ? data.events[eventName] + eventsCount : eventsCount
            })
          })
          _.each(acc, function(accs, key){
            _.each(accs.events, function(eventsCount, eventName){
              data.events[eventName] = data.events[eventName] ? data.events[eventName] + eventsCount : eventsCount
            })
            data.userCount += accs.userCount
          })
          return data
        })
      },params
      ).done(function(didNotDoEventResults){
        //loop through all the returned data and calculate average number of times a person did the events if they did the "correlation event we are interested in"
        _.each(didNotDoEventResults, function(data){
          _.each(data.events, function(count, eventName){
            didNotDoEventAvgs[eventName] = parseFloat((count/data.userCount).toFixed(3))
          })
        })
        dataResults.didEvent = didEventAvgs
        dataResults.didNotDoEvent = didNotDoEventAvgs
        if(dataResults.didEvent && dataResults.didNotDoEvent){
          resolve(dataResults);
        }else{
          reject(dataResults);
        }
      })
    })

  })
}
