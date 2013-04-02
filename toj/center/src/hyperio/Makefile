ifneq ($(KERNELRELEASE),)
	hyperio-objs := hyperio_mod.o judgk_hyperio.o
	obj-m := hyperio.o
else
	KERNEL_SOURCE := /usr/lib/modules/$(shell uname -r)/build
	PWD := $(shell pwd)
default:
	${MAKE} -C ${KERNEL_SOURCE} SUBDIRS=${PWD} modules

	g++ -O2 test.cpp -o test
clean:
	${MAKE} -C ${KERNEL_SOURCE} SUBDIRS=${PWD} clean
endif
