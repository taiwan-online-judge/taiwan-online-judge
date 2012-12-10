ifneq ($(KERNELRELEASE),)
	judgm-objs := judgm_mod.o judgm_proc.o judgm_syscall.o judgm_syscall_asm.o judgm_security.o
	obj-m := judgm.o
else
	KERNEL_SOURCE := /usr/lib/modules/$(shell uname -r)/build
	PWD := $(shell pwd)
default:
	${MAKE} -C ${KERNEL_SOURCE} SUBDIRS=${PWD} modules
	gcc judge_app.c judge_server.c -lcap -ldl -pthread -lpq -o judge
	gcc -shared -fPIC judgx_lib.c -o libjudgx.so
	gcc -shared -fPIC -fvisibility=hidden -O2 line.c -Wl,-rpath,'$$ORIGIN' -L. -ljudgx -lrt -pthread -o line.so
	gcc -shared -fPIC -fvisibility=hidden -O2 check.c -Wl,-rpath,'$$ORIGIN' -L. -ljudgx -pthread -o check.so
	gcc -shared -fPIC -fvisibility=hidden -O2 line_vscore.c -Wl,-rpath,'$$ORIGIN' -L. -ljudgx -lrt -pthread -o line_vscore.so
	gcc -shared -fPIC -fvisibility=hidden -O2 check_reactgrader.c -Wl,-rpath,'$$ORIGIN' -L. -ljudgx -pthread -o check_reactgrader.so
clean:
	${MAKE} -C ${KERNEL_SOURCE} SUBDIRS=${PWD} clean
endif
