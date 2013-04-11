ifneq ($(KERNELRELEASE),)
	judgk-objs := judgk_mod.o judgk_proc.o judgk_syscall.o judgk_syscall_asm.o judgk_security.o judgk_security_asm.o judgk_hyperio.o
	obj-m := judgk.o
else
	KERNEL_SOURCE := /usr/lib/modules/3.8.4-1-ARCH/build
	PWD := $(shell pwd)
default:
	${MAKE} -C ${KERNEL_SOURCE} M=${PWD} modules
	mv judgk.ko ../judge/

	g++ -g -rdynamic -fvisibility=hidden -O2 center_server.cpp center_manage.cpp center_judge.cpp tool.cpp  /srv/http/toj/php/event_exec.cpp -ldl -lpq -ltar -lbz2 -ljson -lcurl -pthread -o center_server
	g++ -g -O2 judge_server.cpp judge_manage.cpp tool.cpp -ldl -lbz2 -ltar -pthread -o judge_server
	mv center_server ../
	mv judge_server ../judge/

	g++ -shared -fPIC -fvisibility=hidden -O2 jmod_test_manage.cpp -ldl -ljson -pthread -o jmod_test_manage.so
	g++ -shared -fPIC -fvisibility=hidden -O2 jmod_test_line.cpp -ljson -pthread -o jmod_test_line.so 
	g++ -shared -fPIC -fvisibility=hidden -O2 jmod_test_check.cpp -o jmod_test_check.so
	mv jmod_test_manage.so ../jmod/jmod_test/
	mv jmod_test_line.so ../jmod/jmod_test/
	mv jmod_test_check.so ../jmod/jmod_test/
	tar -jcvf ../tmp/jmodpack/jmod_test.tar.bz2 -C ../jmod/jmod_test .

	g++ -shared -fPIC -fvisibility=hidden -O2 sprout_tar_check.cpp -o ../pro/15/private/check.so
clean:
	${MAKE} -C ${KERNEL_SOURCE} SUBDIRS=${PWD} clean
endif
