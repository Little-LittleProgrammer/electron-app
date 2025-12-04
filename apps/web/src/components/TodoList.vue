<template>
    <div class="todo-list-container">
        <div v-if="todos.length > 0" class="w-[600px] border-t border-gray-200 bg-white p-[4px] text-[12px]">
            <div class="mb-[4px] flex items-center justify-between">
                <h3 class="font-semibold text-gray-800">任务列表</h3>
                <div class="text-gray-500">{{ completedCount }}/{{ todos.length }} 已完成</div>
            </div>
            <div>
                <div v-for="todo in todos" :key="todo.id" class="mb-[4px] flex items-start space-x-3 rounded-lg border border-gray-200 bg-white p-[4px] pl-[10px] shadow-sm transition hover:border-blue-200">
                    <input type="checkbox" :checked="todo.status === 'completed'" @change="$emit('toggle', todo.id)" class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" :disabled="todo.status === 'cancelled'" />
                    <div class="flex-1">
                        <div class="flex items-center justify-between">
                            <span :class="['font-medium', todo.status === 'completed' ? 'text-gray-500 line-through' : todo.status === 'cancelled' ? 'text-gray-400' : 'text-gray-800']">
                                {{ todo.content }}
                            </span>
                            <span :class="['inline-flex items-center rounded-full px-2 py-1 font-medium', getStatusClass(todo.status)]">
                                {{ getStatusText(todo.status) }}
                            </span>
                        </div>
                        <div v-if="todo.description" class="mt-1 text-xs text-gray-500">
                            {{ todo.description }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="p-4 text-center text-gray-500">暂无待办事项</div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface TodoItem {
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    description?: string;
    createdAt?: number;
    updatedAt?: number;
}

interface Props {
    todos: TodoItem[];
}

interface Emits {
    (event: 'toggle', id: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const completedCount = computed(() => props.todos.filter((todo) => todo.status === 'completed').length);

const getStatusClass = (status: TodoItem['status']): string => {
    switch (status) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'in_progress':
            return 'bg-blue-100 text-blue-800';
        case 'completed':
            return 'bg-green-100 text-green-800';
        case 'cancelled':
            return 'bg-gray-100 text-gray-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const getStatusText = (status: TodoItem['status']): string => {
    switch (status) {
        case 'pending':
            return '待处理';
        case 'in_progress':
            return '进行中';
        case 'completed':
            return '已完成';
        case 'cancelled':
            return '已取消';
        default:
            return '未知';
    }
};
</script>

<style scoped>
.todo-list-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.todo-list-container input[type='checkbox']:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.todo-list-container input[type='checkbox']:not(:disabled):hover {
    border-color: #3b82f6;
}
</style>
