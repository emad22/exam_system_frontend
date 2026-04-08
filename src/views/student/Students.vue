<template>
    <div class="students-page">
        <h2>Students</h2>
        <button @click="showAddForm = true" class="add-btn">➕ Add Student</button>

        <!-- Add / Edit Form -->
        <div v-if="showAddForm" class="form-container">
            <h3>{{ editStudent ? 'Edit' : 'Add' }} Student</h3>
            <form @submit.prevent="saveStudent">
                <input v-model="studentForm.name" placeholder="Name" required />
                <input v-model="studentForm.email" placeholder="Email" type="email" required />
                <button type="submit">{{ editStudent ? 'Update' : 'Add' }}</button>
                <button @click="cancelForm" type="button">Cancel</button>
            </form>
        </div>

        <!-- Students Table -->
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="student in students" :key="student.id">
                    <td>{{ student.id }}</td>
                    <td>{{ student.name }}</td>
                    <td>{{ student.email }}</td>
                    <td>
                        <button @click="edit(student)">✏️</button>
                        <button @click="remove(student.id)">🗑️</button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const students = ref([])
const showAddForm = ref(false)
const editStudent = ref(null)

const studentForm = ref({
    name: '',
    email: ''
})

const fetchStudents = async () => {
    const res = await axios.get('/api/students') // رابط API في Laravel
    students.value = res.data
}

const saveStudent = async () => {
    if (editStudent.value) {
        // تحديث
        await axios.put(`/api/students/${editStudent.value.id}`, studentForm.value)
    } else {
        // إضافة جديد
        await axios.post('/api/students', studentForm.value)
    }
    fetchStudents()
    cancelForm()
}

const edit = (student) => {
    editStudent.value = student
    studentForm.value = { ...student }
    showAddForm.value = true
}

const remove = async (id) => {
    if (confirm('Are you sure you want to delete this student?')) {
        await axios.delete(`/api/students/${id}`)
        fetchStudents()
    }
}

const cancelForm = () => {
    showAddForm.value = false
    editStudent.value = null
    studentForm.value = { name: '', email: '' }
}

onMounted(fetchStudents)
</script>

<style scoped>
.students-page {
    padding: 20px;
}

.add-btn {
    margin-bottom: 15px;
    padding: 8px 15px;
    background: #4ade80;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    color: white;
}

table {
    width: 100%;
    border-collapse: collapse;
}

th,
td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
}

button {
    margin-right: 5px;
    cursor: pointer;
}

.form-container {
    margin-bottom: 20px;
    padding: 15px;
    background: #f3f4f6;
    border-radius: 8px;
}

input {
    margin-right: 10px;
    padding: 5px;
}
</style>