const CACHE_NAME = 'budget_tracker_cache_3';
const RUNTIME_CACHE = "budget_tracker_runtime_cache_3";

const FILES_TO_CACHE = [
	'/',
	'/index.html',
	'/styles.css',
	'/index.js',
	'/icons/icon-192x192.png',
	'/icons/icon-512x512.png'
]

self.addEventListener('install', e => {
	//Create static files cache and store the static files
	const install = async () => {
		const cache = await caches.open(CACHE_NAME);
		await cache.addAll(FILES_TO_CACHE);
		return self.skipWaiting();
	}

	e.waitUntil(install());
})

self.addEventListener('activate', e => {

	const activate = async () => {
		const cacheList = await caches.keys();

		//Delete caches that we aren't currently using
		const oldCacheList = cacheList.filter(cache => cache !== CACHE_NAME && cache !== RUNTIME_CACHE);
		await Promise.all(oldCacheList.map(cache => caches.delete(cache)));
		return self.clients.claim();
	}

	e.waitUntil(activate());
})



self.addEventListener('fetch', e => {

	//For requests other than GET, do a normal fetch which will be stored in indexedDB.
	const response = async () => {
		// console.log(cachedResponse)
		if (e.request.method !== "GET") {
			console.log('POST')
			return fetch(e.request)
		}

		//If online, fetch from server to keep data on the page updated
		if (e.request.url.includes('/api/transaction')) {
			const cache = await caches.open(RUNTIME_CACHE);
			console.log('hi	')
			try {
				const fetchedResponse = await fetch(e.request);
				cache.put(e.request, fetchedResponse.clone());

				return fetchedResponse;

			} catch(err) {
				return caches.match(e.request);
			}
		}

	
		//Check if the response to the request is cached, then return the cached response.
		const cachedResponse = await caches.match(e.request);
		if (cachedResponse) {
			return cachedResponse;
		}

		//If no cached response, open the database cache and do a fetch request normally and cache the cloned response.
		const cache = await caches.open(RUNTIME_CACHE);
		const fetchedResponse = await	fetch(e.request);
		
		await cache.put(e.request, fetchedResponse.clone());

		return fetchedResponse;
	}

	e.respondWith(response());

})




