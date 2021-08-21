const CACHE_NAME = 'budget_tracker_cache_1';
const DATABASE_CACHE = "budget_tracker_db_cache_1";

const FILES_TO_CACHE = [
	'/',
	'/index.html',
	'/styles.css',
	'/index.js'
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
		const oldCacheList = cacheList.filter(cache => cache !== CACHE_NAME && cache !== DATABASE_CACHE);
		await Promise.all(oldCacheList.map(cache => caches.delete(cache)));
		return self.clients.claim();
	}

	e.waitUntil(activate());
})



self.addEventListener('fetch', e => {

	//Check if the response to the request is cached, then return the cached response.
	//If no cached response, open the database cache and do a fetch request normally and cache the cloned response.
	const response = async () => {
		const cachedResponse = await caches.match(e.request);
	
		console.log(cachedResponse)

		if (cachedResponse) {
			return cachedResponse;
		}

		const cache = await caches.open(DATABASE_CACHE);
		const fetchedResponse = await	fetch(e.request);
		
		await cache.put(e.request, fetchedResponse.clone());

		return fetchedResponse;
	}

	e.respondWith(response());

})




