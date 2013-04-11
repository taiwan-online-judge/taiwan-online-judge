.code64
.section .data	//Don't run these code, just data for copy
.global judgk_security_block
.global judgk_security_blockend
.extern judgk_security_checkaddr

//First 8 bytes is original function address
judgk_security_block:
    push %rbx
    push %rcx
    push %rdx
    push %rsi
    push %rdi
    push %rbp
    push %r8
    push %r9
    push %r10
    push %r11
    push %r12
    push %r13
    push %r14
    push %r15
    pushfq
    
    callq *(judgk_security_checkaddr)

    popfq
    pop %r15
    pop %r14
    pop %r13
    pop %r12
    pop %r11
    pop %r10
    pop %r9
    pop %r8
    pop %rbp
    pop %rdi
    pop %rsi
    pop %rdx
    pop %rcx
    pop %rbx

    test %rax,%rax
    jnz .block

    call .getrip
.offset:
    sub $(.offset - judgk_security_block + 8),%rax
    jmp *(%rax)

.block:
    ret

.getrip:
    mov (%rsp),%rax
    ret
judgk_security_blockend:
