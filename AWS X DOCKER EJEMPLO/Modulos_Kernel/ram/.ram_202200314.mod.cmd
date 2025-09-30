savedcmd_ram_202200314.mod := printf '%s\n'   ram_202200314.o | awk '!x[$$0]++ { print("./"$$0) }' > ram_202200314.mod
