const mangayomiSources = [{
    "name": "Eporner",
    "lang": "en",
    "baseUrl": "https://www.eporner.com",
    "apiUrl": "https://www.eporner.com/api/v2/video/search/",
    "iconUrl": "https://www.eporner.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.1",
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
        const id = url.match(/video-([a-zA-Z0-9]+)/)?.[1] || url.split("/").pop();
        const api = `https://www.eporner.com/api/v2/video/id/?id=${id}&format=json`;
        const res = await new Client().get(api, this.getHeaders());
        const v = JSON.parse(res.body);
        const videos = [];
        if (v.embed) {
            videos.push({ url: v.embed, originalUrl: v.embed, quality: "Embed" });
        }
        // Try to get direct mp4s from the page as fallback
        try {
            const pageRes = await new Client().get(url, this.getHeaders());
            const matches = pageRes.body.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/g) || [];
            for (const src of [...new Set(matches)]) {
                videos.push({
                    url: src,
                    originalUrl: src,
                    quality: src.includes("2160") ? "2160p" : src.includes("1080") ? "1080p" : src.includes("720") ? "720p" : "Auto"
                });
            }
        } catch (e) {}
        if (videos.length === 0) {
            videos.push({ url: url, originalUrl: url, quality: "Auto" });
        }
        return videos;
    }
}
