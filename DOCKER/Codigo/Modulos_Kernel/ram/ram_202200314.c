// ram_202200314.c
#include <linux/module.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <linux/mm.h>       // si_meminfo
#include <linux/sysinfo.h>  // struct sysinfo y si_meminfo

#define PROC_NAME "ram_202200314"

static int ram_show(struct seq_file *m, void *v)
{
    struct sysinfo info;
    unsigned long total_kb, free_kb, used_kb;
    unsigned int percent_used;

    si_meminfo(&info);
    total_kb    = (info.totalram * info.mem_unit) / 1024; // en KB
    free_kb     = (info.freeram * info.mem_unit) / 1024;  // en KB
    used_kb     = total_kb - free_kb;
    percent_used = (total_kb > 0) ? (used_kb * 100 / total_kb) : 0;

    /*
     *  JSON
     * {
     *   "total":    72343,
     *   "libre":    241334,
     *   "uso":      14213,
     *   "porcentaje": 23
     * }
     */
    seq_printf(m,
        "{\n"
        "  \"total\": %lu,\n"
        "  \"libre\": %lu,\n"
        "  \"uso\": %lu,\n"
        "  \"porcentaje\": %u\n"
        "}\n",
        total_kb, free_kb, used_kb, percent_used);

    return 0;
}

static int ram_open(struct inode *inode, struct file *file)
{
    return single_open(file, ram_show, NULL);
}

static const struct proc_ops ram_fops = {
    .proc_open    = ram_open,
    .proc_read    = seq_read,
    .proc_lseek   = seq_lseek,
    .proc_release = single_release,
};

static int __init ram_init(void)
{
    proc_create(PROC_NAME, 0, NULL, &ram_fops);
    pr_info("ram_202200314 cargado en /proc/%s\n", PROC_NAME);
    return 0;
}

static void __exit ram_exit(void)
{
    remove_proc_entry(PROC_NAME, NULL);
    pr_info("ram_202200314 removido\n");
}

module_init(ram_init);
module_exit(ram_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Engel Coc");
MODULE_DESCRIPTION("Módulo de kernel que expone info de RAM en JSON (total, libre, uso, porcentaje)");
