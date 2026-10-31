// Stolen from: https://developers.cloudflare.com/workers/examples/cors-header-proxy/

// Modifications:
// - Accept requests from '*.luludodo.de' and 'localhost'
// - Removed default api url
// - Reformatted to match my coding style

export default {
    async fetch(request: Request): Promise<Response> {

        const url = new URL(request.url);
        if (url.pathname !== '/') {
            return new Response(null, {
                status: 404,
                statusText: 'Page Not Found',
            })
        }

        let origin = 'https://luludodo.de'
        const requestOrigin = request.headers.get('Origin')
        if (requestOrigin) {
            const requestUrl = new URL(requestOrigin)
            if ((
                requestUrl.hostname === 'luludodo.de' ||
                requestUrl.hostname.endsWith('.luludodo.de') ||
                requestUrl.hostname === 'localhost' ||
                requestUrl.hostname === '127.0.0.1' ||
                requestUrl.hostname === '::1'
            ) && (
                requestUrl.protocol === 'https:' ||
                requestUrl.protocol === 'http:'
            )) {
                origin = requestUrl.origin
            }
        }

        const corsHeaders = {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
            'Access-Control-Max-Age': '86400',
            'Vary': 'Origin',
        }

        async function handleRequest(url: URL, request: Request) {
            const apiUrl = url.searchParams.get('api')
            if (apiUrl === null) {
                return new Response(null, {
                    status: 400,
                    statusText: 'Missing API url'
                })
            }

            // Rewrite request to point to API URL. This also makes the request mutable
            // so you can add the correct Origin header to make the API server think
            // that this request is not cross-site.
            const corsRequest = new Request(apiUrl, request)
            corsRequest.headers.set('Origin', new URL(apiUrl).origin)
            let response = await fetch(corsRequest)

            // Recreate the response so you can modify the headers
            response = new Response(response.body, response)

            // Set CORS headers
            response.headers.set('Access-Control-Allow-Origin', origin)

            // Append to/Add Vary header so browser will cache response correctly
            response.headers.append('Vary', 'Origin')

            return response
        }

        async function handleOptions(request: Request) {
            if (
                request.headers.get('Origin') !== null &&
                request.headers.get('Access-Control-Request-Method') !== null &&
                request.headers.get('Access-Control-Request-Headers') !== null
            ) {
                // Handle CORS preflight requests.
                return new Response(null, {
                    headers: {
                        ...corsHeaders,
                        'Access-Control-Allow-Headers': request.headers.get(
                            'Access-Control-Request-Headers',
                        )!,
                    },
                })
            } else {
                // Handle standard OPTIONS request.
                return new Response(null, {
                    headers: {
                        Allow: 'GET, HEAD, POST, OPTIONS',
                    },
                })
            }
        }

        if (request.method === 'OPTIONS') {
            // Handle CORS preflight requests
            return handleOptions(request);
        } else if (
            request.method === 'GET' ||
            request.method === 'HEAD' ||
            request.method === 'POST'
        ) {
            // Handle requests to the API server
            return handleRequest(url, request)
        } else {
            return new Response(null, {
                status: 405,
                statusText: 'Method Not Allowed',
            })
        }
    },
} satisfies ExportedHandler;
