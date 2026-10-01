<script setup>
defineProps({ resume: Object })
const fields = {
  name: '姓名',
  phone: '电话',
  email: '邮箱',
  birthYear: '出生年份',
  education: '学历',
  university: '毕业院校',
  major: '专业',
  graduationDate: '毕业时间',
  expectedPosition: '期望职位',
  expectedSalary: '期望薪资',
  expectedCity: '期望城市',
  workExperience: '工作经历',
  skills: '专业技能',
  selfEvaluation: '自我评价',
}
</script>
<template>
  <el-descriptions v-if="resume" :column="1" border
    ><el-descriptions-item v-for="(label, key) in fields" :key="key" :label="label"
      ><span class="pre-wrap">{{ resume[key] || '未填写' }}</span></el-descriptions-item
    ></el-descriptions
  ><el-empty v-else description="简历已删除或暂不可用" />
</template>
