// cpu_202200314.c
#include <linux/module.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <linux/kernel_stat.h> // kcpustat_cpu
#include <linux/cpumask.h>     // for_each_online_cpu
#include <linux/delay.h>       // msleep

#define PROC_NAME "cpu_202200314"

static int cpu_show(struct seq_file *m, void *v)
{
    unsigned long long user1 = 0, nice1 = 0, system1 = 0, idle1 = 0;
    unsigned long long user2 = 0, nice2 = 0, system2 = 0, idle2 = 0;
    unsigned int cpu;
    unsigned long long usado, total, porcentaje;
    unsigned long long user, nice, system, idle;

    // Primera muestra de jiffies
    for_each_online_cpu(cpu) {
        user1   += kcpustat_cpu(cpu).cpustat[CPUTIME_USER];
        nice1   += kcpustat_cpu(cpu).cpustat[CPUTIME_NICE];
        system1 += kcpustat_cpu(cpu).cpustat[CPUTIME_SYSTEM];
        idle1   += kcpustat_cpu(cpu).cpustat[CPUTIME_IDLE];
    }

    msleep(1000);

    // Segunda muestra de jiffies
    for_each_online_cpu(cpu) {
        user2   += kcpustat_cpu(cpu).cpustat[CPUTIME_USER];
        nice2   += kcpustat_cpu(cpu).cpustat[CPUTIME_NICE];
        system2 += kcpustat_cpu(cpu).cpustat[CPUTIME_SYSTEM];
        idle2   += kcpustat_cpu(cpu).cpustat[CPUTIME_IDLE];
    }

    // Calcula las diferencias
    user   = user2   - user1;
    nice   = nice2   - nice1;
    system = system2 - system1;
    idle   = idle2   - idle1;

    usado = user + nice + system;
    total = usado + idle;
    porcentaje = (total > 0) ? (usado * 100 / total) : 0;

    seq_printf(m,
        "{\n"
        "  \"porcentajeUso\": %llu\n"
        "}\n",
        porcentaje);

    return 0;
}

static int cpu_open(struct inode *inode, struct file *file)
{
    return single_open(file, cpu_show, NULL);
}

static const struct proc_ops cpu_fops = {
    .proc_open    = cpu_open,
    .proc_read    = seq_read,
    .proc_lseek   = seq_lseek,
    .proc_release = single_release,
};

static int __init cpu_202200314_init(void)
{
    proc_create(PROC_NAME, 0, NULL, &cpu_fops);
    pr_info("%s cargado en /proc/%s\n", PROC_NAME, PROC_NAME);
    return 0;
}

static void __exit cpu_202200314_exit(void)
{
    remove_proc_entry(PROC_NAME, NULL);
    pr_info("%s removido\n", PROC_NAME);
}

module_init(cpu_202200314_init);
module_exit(cpu_202200314_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Engel Emilio");
MODULE_DESCRIPTION("Módulo de kernel que expone porcentaje de CPU en JSON");

