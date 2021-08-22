let transactions = [];
let myChart;


//Open database and setup transaction store
console.log('opening indexedDB')
const request = window.indexedDB.open('budgetTracker', 1);

//If the user reopens the page, and has reconnected to the internet
//populate the server DB and clear the client DB
if (navigator.onLine) {
	request.onsuccess = e => {
		sendRecordsToServer();
		clearTransactionDB();
	}
}


request.onupgradeneeded = e => {
	const db = request.result;
	db.createObjectStore('transaction', {keyPath: 'date'});
}

fetch("/api/transaction")
  .then(response => {
		console.log('fetch')
    return response.json();
  })
  .then(data => {
    // save db data on global variable
    transactions = data;

		//If user is offline, populate the chart with data from the client DB
		if (!navigator.onLine) {
			console.log('populate offline transactions to chart')
			getOfflineTransactions()
		}	else {	
    		populateTotal();
    		populateTable();
    		populateChart();
		}
  });

function populateTotal() {
  // reduce transaction amounts to a single total value
  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

function populateTable() {
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach(transaction => {
    // create and populate a table row
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

function populateChart() {
  // copy array and reverse it
  let reversed = transactions.slice().reverse();
  let sum = 0;

  // create date labels for chart
  let labels = reversed.map(t => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // create incremental values for chart
  let data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  let ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: 'line',
      data: {
        labels,
        datasets: [{
            label: "Total Over Time",
            fill: true,
            backgroundColor: "#6666ff",
            data
        }]
    }
  });
}

async function getOfflineTransactions() {
	const db = request.result;
	const transaction = db.transaction(['transaction'], 'readwrite');
	const budgetTrackerStore = transaction.objectStore('transaction');

	const allTransactions = budgetTrackerStore.getAll();

	allTransactions.onsuccess = e => {
		let transactionsArr = allTransactions.result;
		let placeHolderId = 0;

		transactionsArr.forEach(t => {
			t._id = String(placeHolderId++);
			t.__v = 0;

			transactions.unshift(t);
		})

		populateTotal();
    populateTable();
    populateChart();
	}
}

//Clear the database once the user is back online
function clearTransactionDB() {
	console.log('clear db')
	const db = request.result;
	const transaction = db.transaction(['transaction'], 'readwrite');
	const budgetTrackerStore = transaction.objectStore('transaction');

	budgetTrackerStore.clear().onsuccess = e => {
		console.log('db cleared')
	}
}

//Send all the transactions to the server once the user is back online
function sendRecordsToServer() {
	console.log('send to server')
	const db = request.result;
	const transaction = db.transaction(['transaction'], 'readwrite');
	const budgetTrackerStore = transaction.objectStore('transaction');

	const allTransactions = budgetTrackerStore.getAll();

	// console.log(allTransactions)

	allTransactions.onsuccess = async e => {
		try {
			if (allTransactions.result.length !== 0) { 
				const response = await fetch("/api/transaction/bulk", {
  			  method: "POST",
  			  body: JSON.stringify(allTransactions.result),
  			  headers: {
  			    Accept: "application/json, text/plain, */*",
  			    "Content-Type": "application/json"
  			  }
  			});

				if (response.ok) {
					console.log('transactions saved')
				} else {//catch any status code other than ok
					console.log(await response.json())//print err
				}
			} else {
				console.log('Nothing to store')
			}

		} catch(err) {
			console.log(err)
		}
	}
}

//saveRecord takes in data while the user is offline and stores it in an
//the client DB
function saveRecord(data) {
	const db = request.result;
	const transaction = db.transaction(['transaction'], 'readwrite');
	const budgetTrackerStore = transaction.objectStore('transaction');

	budgetTrackerStore.add(data);
}

function sendTransaction(isAdding) {
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  // validate form
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  }
  else {
    errorEl.textContent = "";
  }

  // create record
  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  // add to beginning of current array of data
  transactions.unshift(transaction);

  // re-run logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();
  
  // also send to server
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
  .then(response => {    
    return response.json();
  })
  .then(data => {
    if (data.errors) {
      errorEl.textContent = "Missing Information";
    }
    else {
      // clear form
      nameEl.value = "";
      amountEl.value = "";
    }
  })
  .catch(err => {
    // fetch failed, so save in indexed db
    saveRecord(transaction);

    // clear form
    nameEl.value = "";
    amountEl.value = "";
  });
}


document.querySelector("#add-btn").onclick = function() {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function() {
  sendTransaction(false);
};

//Check when the user comes back online then send all data to server
window.addEventListener('online', e => {
	console.log('online')
	sendRecordsToServer();
	clearTransactionDB();
});