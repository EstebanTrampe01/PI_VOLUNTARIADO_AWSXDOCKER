savedcmd_cpu_202200314.mod := printf '%s\n'   cpu_202200314.o | awk '!x[$$0]++ { print("./"$$0) }' > cpu_202200314.mod
