import axios from 'axios'
import { attachInterceptors } from './interceptors'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

attachInterceptors(api)
