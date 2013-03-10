#include "event_exec.h"

#define EVENT_BUFLEN 1005
#define EVENT_URL "http://localhost/toj/php/event.php"

struct event_handle
{
    int init, plen, blen;
    char *post, *buf;
    pthread_mutex_t mutex;
    CURL *handle;
};

static struct event_handle conn;

size_t event_write_cb(void *in, size_t siz, size_t nb, void *buf)
{
    int len;
    len = siz*nb+1;
    if(len > conn.blen)
    {
	len = conn.blen-1;
    }
    memcpy(buf, in, len);
    ((char*)buf)[len] = 0;
    return siz*nb;
}

int event_init()
{
    if(conn.init)
    {
	return 0;
    }
    conn.plen = conn.blen = EVENT_BUFLEN;
    conn.post = (char*)malloc(EVENT_BUFLEN);
    conn.buf = (char*)malloc(EVENT_BUFLEN);
    curl_global_init(CURL_GLOBAL_ALL);
    conn.handle = curl_easy_init();
    curl_easy_setopt(conn.handle, CURLOPT_URL, EVENT_URL);
    curl_easy_setopt(conn.handle, CURLOPT_WRITEFUNCTION, event_write_cb);
    curl_easy_setopt(conn.handle, CURLOPT_WRITEDATA, conn.buf);
    pthread_mutex_init(&conn.mutex, NULL);
    conn.init = 1;
    return 1;
}

int event_exec(const char *fname, const char *name, const char *arg)
{
    int res, len;
    char *t;
    event_init();
    if(pthread_mutex_lock(&conn.mutex) == 0)
    {
	len = 0;
	len += strlen(fname)+6;
	len += strlen(name)+6;
	len += strlen(arg)+6;
	if(len > conn.plen)
	{
	    t = (char*)malloc(len);
	    if(!t)
	    {
		pthread_mutex_unlock(&conn.mutex);
		return 0;
	    }
	    free(conn.post);
	    conn.post = t;
	    conn.plen = len;
	}
	sprintf(conn.post, "fname=%s&name=%s&arg=%s", fname, name, arg);
	curl_easy_setopt(conn.handle, CURLOPT_POSTFIELDS, conn.post);
	res = curl_easy_perform(conn.handle);
	if(res)
	{
	    pthread_mutex_unlock(&conn.mutex);
	    return 0;
	}
	fprintf(stderr, "%s\n", conn.buf);
	if(!strcmp(conn.buf, "true"))
	{
	    pthread_mutex_unlock(&conn.mutex);
	    return 1;
	}

	pthread_mutex_unlock(&conn.mutex);
    }
    return 0;
}
