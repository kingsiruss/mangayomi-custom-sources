const mangayomiSources = [{
    "name": "Eporner",
    "lang": "en",
    "baseUrl": "https://www.eporner.com",
    "apiUrl": "https://www.eporner.com/api/v2/video/search/",
    "iconUrl": "https://www.eporner.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.2",
    "isNsfw": true,
    "sourceCodeUrl": "https://raw.githubusercontent.com/kingsiruss/mangayomi-custom-sources/main/javascript/anime/src/en/eporner.js",
    "sourceCodeLanguage": 1
}];

class DefaultExtension extends MProvider {
    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.eporner.com/"
        };
    }

    calcHash(hex) {
        let result = "";
        for (let i = 0; i < 32; i += 8) {
            const num = parseInt(hex.substr(i, 8), 16);
            result += num.toString(36);
        }
        return result;
    }

    async apiSearch(query, page, order = "most-popular") {
        const url = `https://www.eporner.com/api/v2/video/search/?query=${encodeURIComponent(query)}&per_page=30&page=${page || 1}&order=${order}&gay=0&lq=1&format=json`;
        const res = await new Client().get(url, this.getHeaders());
        return JSON.parse(res.body);
    }

    parseApi(data) {
        const videos = data.videos || [];
        const list = videos.map(v => ({
            name: v.title || "Untitled",
            link: v.url || `https://www.eporner.com/video-${v.id}/`,
            imageUrl: v.default_thumb?.src || v.thumbs?.[0]?.src || ""
        }));
        return { list, hasNextPage: (data.page || 1) < (data.total_pages || 1) };
    }

    async getPopular(page) {
        const data = await this.apiSearch("", page, "most-popular");
        return this.parseApi(data);
    }

    async getLatestUpdates(page) {
        const data = await this.apiSearch("", page, "latest");
        return this.parseApi(data);
    }

    async search(query, page, filters) {
        const data = await this.apiSearch(query, page, "latest");
        return this.parseApi(data);
    }

    async getDetail(url) {
        const id = url.match(/video-([a-zA-Z0-9]+)/)?.[1] || url.split("/").pop();
        const api = `https://www.eporner.com/api/v2/video/id/?id=${id}&format=json`;
        const res = await new Client().get(api, this.getHeaders());
        const v = JSON.parse(res.body);
        return {
            name: v.title || "Video",
            description: (v.keywords || "").toString(),
            status: 5,
            chapters: [{ name: "Watch", url: url, dateUpload: Date.now().toString() }]
        };
    }

    async getVideoList(url) {
        const pageRes = await new Client().get(url, this.getHeaders());
        const html = pageRes.body || "";
        const hashMatch = html.match(/hash\s*[:=]\s*["']([\da-f]{32})/i);
        const idMatch = url.match(/video-([a-zA-Z0-9]+)/) || html.match(/video-([a-zA-Z0-9]+)/);
        const videoId = idMatch?.[1];

        if (!videoId || !hashMatch) {
            return [{ url: url, originalUrl: url, quality: "Auto (fallback)" }];
        }

        const hash = this.calcHash(hashMatch[1]);
        const xhrUrl = `https://www.eporner.com/xhr/video/${videoId}?hash=${hash}&device=generic&domain=www.eporner.com&fallback=false`;
        const xhrRes = await new Client().get(xhrUrl, this.getHeaders());
        const data = JSON.parse(xhrRes.body || "{}");

        const videos = [];
        const sources = data.sources || {};
        for (const kind of Object.keys(sources)) {
            const formats = sources[kind];
            if (!formats || typeof formats !== "object") continue;
            for (const [formatId, info] of Object.entries(formats)) {
                if (info && info.src && info.src.startsWith("http")) {
                    const quality = formatId.includes("2160") ? "2160p" :
                                   formatId.includes("1080") ? "1080p" :
                                   formatId.includes("720") ? "720p" :
                                   formatId.includes("480") ? "480p" : formatId;
                    videos.push({
                        url: info.src,
                        originalUrl: info.src,
                        quality: quality + (kind === "hls" ? " (HLS)" : "")
                    });
                }
            }
        }

        if (videos.length === 0) {
            videos.push({ url: url, originalUrl: url, quality: "Auto" });
        }
        return videos;
    }
}
