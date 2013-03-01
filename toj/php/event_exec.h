#ifndef EVENT_EXEC
#define EVENT_EXEC

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <curl/curl.h>
#include <pthread.h>

int event_exec(const char *fname, const char *name, const char *arg);

#endif
