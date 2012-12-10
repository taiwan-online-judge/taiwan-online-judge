#include<stdio.h>
#include<stdlib.h>
#include<limits.h>
#include<fcntl.h>
#include<signal.h>
#include<pthread.h>
#include<semaphore.h>
#include<termios.h>

#include"judge_def.h"
#include"judgx.h"

struct check_thread_info{
    int status;
    int score;
    int maxscore;
    sem_t *done_sem;
};

int mptd;
char ptname[PATH_MAX + 1];
int infd;

// Opponent program for Guess that Cow
// Originally based on soln-opt by Hal Burch
// Extensive changes by Matt Craighead
#include <ctype.h>
#include <string.h>

/*
guess.in: input case
standard input/output: student running program
stderr: grading output
 */


// Shared solver code for Guess that Cow
// Used by soln-mjc, opponent, and testgen
// Originally based on soln-opt by Hal Burch
// Extensive changes by Matt Craighead

#define MAXPROP 8
#define MAXVAL 3 
#define MAXITEM 50 
#define NAME "guess"

#define HASHSIZE 904069

// Mask of cows.  Would use a 64-bit int, but this is more portable and lets me
// optimize things the compiler would do a poor job at.
typedef struct {
    unsigned int lo;
    unsigned int hi;
} CowMask;

typedef struct state {
    CowMask member;
    int score;
    struct state *next;
} state_t;

int item[MAXITEM][MAXPROP];
int nitem, nprop;
int maxSearchDepth = 100;
int noHashTable;
CowMask maskhistory[200];
char query[200][100];
int resp[200];
int nhist;

int nQuestionsUsed, nOptimalQuestions;

state_t *hashTable[HASHSIZE];

CowMask updateMasks[MAXPROP][1 << MAXVAL];

void FindBestQuestion(CowMask poss, int depth, int *question, int *score);

CowMask BuildCowMask(int i)
{
    CowMask cm;
    if (i < 32) {
	cm.lo = 1 << i;
	cm.hi = 0;
    } else {
	cm.lo = 0;
	cm.hi = 1 << (i-32);
    }
    return cm;
}

state_t *HashFind(CowMask poss, int depth)
{
    static state_t fakeHashEntry;
    int h, temp;
    state_t *lp;

    if (noHashTable) {
	h = 0;
	lp = &fakeHashEntry;
    } else {
	// Simple hash function
	h = (poss.lo + poss.hi*7) % HASHSIZE;

	// Check hash table to see if this node has already been searched
	for (lp = hashTable[h]; lp; lp = lp->next) {
	    if ((poss.lo == lp->member.lo) && (poss.hi == lp->member.hi)) {
		return lp;
	    }
	}

	// Alloc a hash entry and link it in
	lp = (state_t *)malloc(sizeof(state_t));
    }

    // Recursively search to find score for this node
    FindBestQuestion(poss, depth+1, &temp, &lp->score);
    lp->member = poss;
    if (!noHashTable) {
	lp->next = hashTable[h];
	hashTable[h] = lp;
    }

    return lp;
}

void CleanHashTable(void)
{
    int i;
    state_t *p, *next;
    for (i = 0; i < HASHSIZE; i++) {
	p = hashTable[i];
	while (p) {
	    next = p->next;
	    free(p);
	    p = next;
	}
	hashTable[i] = NULL;
    }
}

int CountBits(CowMask x)
{
    static int table[16] = {0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4};
    int bits;
    bits = 0;
    while (x.lo) {
	bits += table[x.lo & 0xF];
	x.lo >>= 4;
    }
    while (x.hi) {
	bits += table[x.hi & 0xF];
	x.hi >>= 4;
    }
    return bits;
}

void FindBestResponse(CowMask poss, int question, CowMask *newPoss, int *answer)
{
    int attr = question % MAXPROP;
    int quest = question / MAXPROP;
    int fcnt, tcnt, fquestions, tquestions;
    CowMask fposs, tposs;
    state_t *s;
    int oldNoHashTable;

    oldNoHashTable = noHashTable;
    noHashTable = 0;

    // Must choose answer of true or false, so run the
    // solver on each case
    fposs.lo = poss.lo & ~updateMasks[attr][quest].lo;
    fposs.hi = poss.hi & ~updateMasks[attr][quest].hi;
    tposs.lo = poss.lo &  updateMasks[attr][quest].lo;
    tposs.hi = poss.hi &  updateMasks[attr][quest].hi;
    fcnt = CountBits(fposs);
    tcnt = CountBits(tposs);
    if (fcnt <= 3) {
	fquestions = fcnt-1;
    } else {
	s = HashFind(fposs, 0); fquestions = s->score;
    }
    if (tcnt <= 3) {
	tquestions = tcnt-1;
    } else {
	s = HashFind(tposs, 0); tquestions = s->score;
    }

    // First go by # of questions; if there's a tie, go by
    // # of cows
    if (fquestions > tquestions) {
	*answer = 0;
    } else if (fquestions < tquestions) {
	*answer = 1;
    } else if (fcnt > tcnt) {
	*answer = 0;
    } else if (fcnt < tcnt) {
	*answer = 1;
    } else {
	// arbitrary
	*answer = 0;
	if (nitem == 4 && nQuestionsUsed == 2) *answer = 1;
    }

    *newPoss = *answer ? tposs : fposs;

    noHashTable = oldNoHashTable;
}

void FindBestQuestion(CowMask poss, int depth, int *question, int *score)
{
    CowMask fposs, tposs;
    int lq, lp;
    int bestScore, bestQuestion;
    int tcnt, fcnt;
    state_t *s;

    bestScore = 1000;
    bestQuestion = -1;

    // Consider all properties to ask about
    for (lp = 0; lp < nprop; lp++) {
	// Consider all useful sets of values to ask about
	// An empty list of values to ask about is useless
	// Omit the last property so as to not repeat questions, because
	// all questions can be phrased in two ways
	for (lq = 1; lq < (1 << (MAXVAL-1)); lq++) {
	    // Get the sets of cows remaining after each answer
	    fposs.lo = poss.lo & ~updateMasks[lp][lq].lo;
	    fposs.hi = poss.hi & ~updateMasks[lp][lq].hi;
	    tposs.lo = poss.lo &  updateMasks[lp][lq].lo;
	    tposs.hi = poss.hi &  updateMasks[lp][lq].hi;
	    fcnt = CountBits(fposs);
	    tcnt = CountBits(tposs);

	    // If one answer would leave no cows left, this question
	    // doesn't really give us any information
	    if ((fcnt == 0) || (tcnt == 0)) continue;

	    // How many questions will be required after this one to
	    // solve the puzzle if we get an answer of "yes"?
	    if ((tcnt <= 3) || (depth >= maxSearchDepth)) {
		// Small cases are easy
		tcnt = tcnt - 1;
	    } else {
		// Look in the hash table
		s = HashFind(tposs, depth);
		tcnt = s->score;
	    }

	    // Quit early if no better than the best so far
	    if (tcnt >= bestScore) continue;

	    // How many questions will be required after this one to
	    // solve the puzzle if we get an answer of "no"?
	    if ((fcnt <= 3) || (depth >= maxSearchDepth)) {
		// Small cases are easy
		fcnt = fcnt - 1;
	    } else {
		// Look in the hash table
		s = HashFind(fposs, depth);
		fcnt = s->score;
	    }

	    // Pick the worse of the two
	    if (tcnt < fcnt) tcnt = fcnt;
	    if (tcnt + 1 < bestScore) {
		bestScore = tcnt + 1;
		bestQuestion = lp + lq*MAXPROP;
	    }
	}
    }

    //assert(bestScore < 1000);
    //assert(bestQuestion != -1);

    *question = bestQuestion;
    *score = bestScore;
}

void ParseInputFile(FILE *f)
{
    int lv, lv2;
    char str[3];
    fscanf(f, "%d %d", &nitem, &nprop);

    for (lv = 0; lv < nitem; lv++) {
	for (lv2 = 0; lv2 < nprop; lv2++) {
	    fscanf(f, "%s", str);
	    item[lv][lv2] = str[0] - 'X';
	}
    }

}

void BuildUpdateMasks(void)
{
    int i, lp, lq;

    // Precompute sets of cows remaining after each possible question
    for (lp = 0; lp < nprop; lp++) {
	for (lq = 0; lq < (1 << MAXVAL); lq++) {
	    updateMasks[lp][lq].lo = 0;
	    updateMasks[lp][lq].hi = 0;
	    for (i = 0; i < nitem; i++) {
		if (lq & (1 << item[i][lp])) {
		    CowMask cm = BuildCowMask(i);
		    updateMasks[lp][lq].lo |= cm.lo;
		    updateMasks[lp][lq].hi |= cm.hi;
		}
	    }
	}
    }
}

int judge(struct check_thread_info *thread_info){
    FILE *ioin;
    FILE *ioout;
    FILE *fin;
    char line[256];
    int score, answer, quest, i;
    CowMask poss;

    ioin = fdopen(mptd,"r");
    ioout = fdopen(mptd,"w");
    fin = fdopen(infd,"r");

    CleanHashTable();
    ParseInputFile(fin);
    BuildUpdateMasks();

    // At first, all cows are possible
    poss.lo = 0;
    poss.hi = 0;
    for (i = 0; i < nitem; i++) {
	CowMask cm = BuildCowMask(i);
	poss.lo |= cm.lo;
	poss.hi |= cm.hi;
    }

    nOptimalQuestions = 100;

    // Solve the problem to get the best possible score
    FindBestQuestion(poss, 0, &quest, &nOptimalQuestions);

    nQuestionsUsed = 0;
    maskhistory[nQuestionsUsed] = poss;
    for (;;) {
	if(fgets(line, sizeof(line), ioin) == NULL){
	    return 1;
	}

	if (line[strlen(line)-1] == '\n') line[strlen(line)-1] = 0;
	if (line[0] == 'Q') {
	    int parsed, i, attr, val[3];

	    nQuestionsUsed++;
	    if(nQuestionsUsed > 100){
		fprintf(ioout, "ABORT\n");
		fprintf(stderr, "WRONG\nYour program asked more than 100 questions.\n");
		return 0;
	    }
	    if (!isdigit(line[2])) {
		fprintf(stderr, "Wrong: unexpected input format: %s\n", line);
		return 1;
	    }
	    attr = line[2] - '0';
	    parsed = 0; i = 3;
	    while (line[i] != 0) {
		if ((line[i] != ' ') || line[i+1] < 'X' || line[i+1] > 'Z') {
		    fprintf(stderr, "Wrong: unexpected input format: %s\n", line);
		    return 1;
		}
		val[parsed] = line[i+1]-'X'+1;
		parsed++;
		i += 2;
	    }
	    if (parsed < 1) {
		fprintf(stderr, "Wrong: unexpected input format: %s\n", line);
		return 1;
	    }
	    attr--;
	    quest = 0;
	    for (i = 0; i < parsed; i++) {
		if ((val[i] < 1) || (val[i] > MAXVAL)) {
		    fprintf(stderr, "Incorrect: invalid attribute value in question\n");
		    return 1;
		}
		quest |= 1 << (val[i]-1);
	    }

	    FindBestResponse(poss, attr + quest*MAXPROP, &poss, &answer);
	    strcpy(query[nQuestionsUsed-1], line);
	    maskhistory[nQuestionsUsed-1] = poss;
	    resp[nQuestionsUsed-1] = answer;

	    fprintf(ioout,"%d\n", answer);
	    fflush(ioout);
	} else if (line[0] == 'C') {
	    // Done, check the answer
	    break;
	} else {
	    fprintf(stderr, "Wrong: unexpected input format: %s\n", line);
	    return 1;
	}
    }

    if ((line[1] != ' ') || !isdigit(line[2])) {
	fprintf(stderr, "Wrong: unexpected input format: %s", line);
	return 1;
    }
    if (line[3] != 0) {
	if (!isdigit(line[3]) || (line[4] != 0)) {
	    fprintf(stderr, "Wrong: unexpected input format: %s", line);
	    return 1;
	}
    }
    sscanf(line, "C %d", &answer);
    answer--;

    // To be correct, this cow must be the only remaining possible cow
    if (CountBits(poss) != 1) {
	fprintf(ioout, "ABORT\n");
	fprintf(stderr, "WRONG\n");
	fprintf(stderr, "The following cows are still consistent with the answers given:\n");
	fprintf(stderr, "    ");
	for(i=0; i<32; i++){
	    if(poss.lo&(1<<i)){
		fprintf(stderr, " %d", i+1);
	    }
	}
	for(i=0;i<32; i++){
	    if(poss.hi&(1<<i)){
		fprintf(stderr, " %d", i+32+1);
	    }
	}	
	fprintf(stderr, "\n");
	return 0;
    } else {
	CowMask cm = BuildCowMask(answer);
	if ((poss.lo != cm.lo) || (poss.hi != cm.hi)) { 
	    for(i=0; i<nQuestionsUsed; i++){
		if(!(maskhistory[i].lo&cm.lo)&&!(maskhistory[i].hi&cm.hi))
		    break;
	    }
	    fprintf(ioout, "ABORT\n");
	    fprintf(stderr, "WRONG\nYour program claims the solution is cow %d,\n", answer+1);
	    fprintf(stderr, "but cow %d was eliminated by query #%d (%s) with response %d.\n", answer+1, i+1, query[i], resp[i]);
	    return 0;
	} else {
	    if (nQuestionsUsed <= nOptimalQuestions) {
		score = 10;
	    } else if (nQuestionsUsed == nOptimalQuestions+1) {
		score = 8;
	    } else if (nQuestionsUsed == nOptimalQuestions+2) {
		score = 5;
	    } else if (nQuestionsUsed <= nOptimalQuestions+5) {
		score = 4;
	    } else {
		score = 3;
	    }
	    if (score < 10) {
		fprintf(stderr, "OK %d\n", score);
	    } else {
		fprintf(stderr, "OK\n");
	    }
	    if(nQuestionsUsed < nOptimalQuestions){
		fprintf(stderr, "Student is better than us.\n");
	    }

	    thread_info->score = score;
	    if(nQuestionsUsed < nOptimalQuestions){
		thread_info->score += (nOptimalQuestions - nQuestionsUsed);
	    }
	}
    }

    fprintf(ioout, "DONE\n");

    if(thread_info->score > 10){
	thread_info->maxscore = thread_info->score;
    }else{
	thread_info->maxscore = 10;
    }

    if(thread_info->score == thread_info->maxscore){
	thread_info->status = JUDGE_AC;
    }else{
	thread_info->status = JUDGE_WA;
    }

    return 0;
}

DLL_PUBLIC int init(char *runpath,char *datapath){
    struct termios tes;
    char tpath[PATH_MAX + 1];
    char newpath[PATH_MAX + 1];

    mptd = posix_openpt(O_RDWR);
    grantpt(mptd);
    unlockpt(mptd);
    ptsname_r(mptd,ptname,sizeof(ptname));
    tcgetattr(mptd,&tes);
    cfmakeraw(&tes);
    tcsetattr(mptd,TCSANOW,&tes);

    printf("check1\n");

    snprintf(tpath,sizeof(tpath),"%s/in.txt",datapath);
    snprintf(newpath,sizeof(newpath),"%s/guess.in",runpath);
    if(link(tpath,newpath) == -1){
	unlink(newpath);
	link(tpath,newpath);
    }
    infd = open(tpath,O_RDONLY);
    if(infd == -1){
	goto error;
    }

    printf("check2\n");

    return 0;

error:

    close(mptd);
    close(infd);

    return -1;
}

static void thread_clean(void *arg){
    close(mptd);
    close(infd);
    return;
}
DLL_PUBLIC void* thread(void *arg){
    struct check_thread_info *thread_info;

    pthread_cleanup_push(thread_clean,NULL);
    thread_info = (struct check_thread_info*)arg;
    
    thread_info->status = JUDGE_WA;
    thread_info->score = 0;
    thread_info->maxscore = 10;

    judge(thread_info);

    pthread_cleanup_pop(thread_clean);
    sem_post(thread_info->done_sem);
    return NULL;
}
DLL_PUBLIC int stop(void){
    return 0;
}

DLL_PUBLIC int run(){
    int sptd;
    struct termios tes;

    sptd = open(ptname,O_RDWR);
    tcgetattr(sptd,&tes);
    cfmakeraw(&tes);
    tcsetattr(sptd,TCSANOW,&tes);

    dup2(sptd,0);
    dup2(sptd,1);
    dup2(sptd,2);
    return 0;
}
