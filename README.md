# Budget Tracker


## Visit the page!
[Budget Tracker](https://budget-tracker-9999.herokuapp.com/)



## Table of Contents

* [Description](#description)
* [Service Worker](#service-worker)
* [IndexedDB](#IndexedDB)
* [Acknowledgements](#acknowledgements)
* [Contributors](#contributors)
* [Questions](#Questions)
* [References](#References)

## Description
Budget tracker allows a user to keep track of transactions they have made and see the total on a chart. The user can add or subtract funds while they are connected to the internet as they would normally. In addition to this, the budget tracker can work with little to no connection, allowing the user to add and subtract funds as if they were connected. Once the user reconnects, those transactions persist along with any new transactions added.

## How it works
The two primary APIs used to allow for offline usage are IndexedDB and Service Workers.

### Service Worker
To allow the user to view and use the budget tracker while offline, a service worker is necessary to handle fetch requests for static assets and for content usually given by the server. The service worker also manages the caches for handling those requests

For delivering the static assets, the service worker will check if the assets are cached and return them if found. This implies that the user has been to the site once with good connectivity. If there is no cached response the service worker defaults to fetching assets normally: 

```javascript
//If no cached response, open the database cache and do a fetch request normally and cache the cloned response.
    const cache = await caches.open(RUNTIME_CACHE);
    const fetchedResponse = await	fetch(e.request);

    await cache.put(e.request, fetchedResponse.clone());

    return fetchedResponse;
```

`POST` requests to store transactions are strictly fetched requests and never cached. This is because caches cannot store those requests:

```javascript
if (e.request.method !== 'GET') {
      console.log('POST');
      return fetch(e.request);
}
```
For `GET` requests to the `/api/transaction`, the service worker attempts a fetch first, then checks the cache. The server is checked first in case the user is still connected, so that the chart of transactions remains up to date.

```javascript
//If online, fetch from server to keep data on the page updated
    if (e.request.url.includes('/api/transaction')) {
      const cache = await caches.open(RUNTIME_CACHE);
      try {
        const fetchedResponse = await fetch(e.request);
        cache.put(e.request, fetchedResponse.clone());

        return fetchedResponse;

      } catch(err) {
        return caches.match(e.request);
      }
    }
```


### IndexedDB
IndexedDB is used to store any transactions the user makes while being offline. Storing data to IndexedDB is based on the failure of a normal fetch request to the server:

```javascript
//saveRecord takes in data while the user is offline and stores it in an
//the client DB
function saveRecord(data) {
	const db = request.result;
	const transaction = db.transaction(['transaction'], 'readwrite');
	const budgetTrackerStore = transaction.objectStore('transaction');

	budgetTrackerStore.add(data);
}
```

If the user has an intermittent connection, the app will use an event listen to check whether the user is online, so when the user does reconnect the transactions made offline are sent to the server:

```javascript
//Send all the transactions to the server once the user is back online
function sendRecordsToServer() {
  console.log('send to server');
  const db = request.result;
  const transaction = db.transaction(['transaction'], 'readwrite');
  const budgetTrackerStore = transaction.objectStore('transaction');

  const allTransactions = budgetTrackerStore.getAll();

  // console.log(allTransactions)

  allTransactions.onsuccess = async () => {
    try {
      if (allTransactions.result.length !== 0) {
        const response = await fetch('/api/transaction/bulk', {
          method: 'POST',
          body: JSON.stringify(allTransactions.result),
          headers: {
            Accept: 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          console.log('transactions saved');
        } else {
          //catch any status code other than ok
          console.log(await response.json()); //print err
        }
      } else {
        console.log('Nothing to store from client DB');
      }
    } catch (err) {
      console.log(err);
    }
  };
}
```

After sending the data to the server, the data on the client side is no longer necessary, so `clearTransactionDB` empties the client side database:

```javascript
//Clear the database once the user is back online
function clearTransactionDB() {
  console.log('clear db');
  const db = request.result;
  const transaction = db.transaction(['transaction'], 'readwrite');
  const budgetTrackerStore = transaction.objectStore('transaction');

  budgetTrackerStore.clear().onsuccess = () => {
    console.log('db cleared');
  };
}
```
While the user was offline, the transactions were being populated before the `POST` request. However, the user can possibly reload the page while being offline which would lead to only the old data being populated by the cached response. To ensure that the transactions are viewable even if the user attempts to refresh, there is a check for the online status, and the data from the client side database is populated along with the cached responses from the server:

```javascript
fetch('/api/transaction')
  .then((response) => {
    return response.json();
  })
  .then((data) => {
    // save db data on global variable
    transactions = data;

    //If user is offline, populate the chart with data from the client DB
    if (!navigator.onLine) {
      console.log('populate offline transactions to chart');
      getOfflineTransactions();
    } else {
      populateTotal();
      populateTable();
      populateChart();
    }
  });
```
It is also possible that the user entered transactions while being offline, chose to close the page, and revisited the page when they had a connection. In this case, the client database can be emptied and the data can be sent to the server immediately on load of the page. The data should also be populated:

```javascript
//If the user reopens the page, and has reconnected to the internet
//populate the server DB and clear the client DB
if (navigator.onLine) {
  request.onsuccess = () => {
    sendRecordsToServer();
    clearTransactionDB();
    populateChart();
    populateTable();
    populateTotal();
  };
}
```

## Acknowledgements
Thank you to the UC Berkeley Bootcamp staff for providing the starter code for this app and guiding us on this interesting topic.

## Contributors
Denzal M.

## Questions
Find my other projects on [GitHub](https://github.com/dmartin4820)

Or contact me by email: dom4822@yahoo.com

## References
* [Service Worker Fundamentals](https://developers.google.com/web/fundamentals/primers/service-workers)
* [MDN Docs Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
* [waitUntil](https://developer.mozilla.org/en-US/docs/Web/API/ExtendableEvent/waitUntil)
* [IndexedDB Usage](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)