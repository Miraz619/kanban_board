import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { Application, Request, Response } from 'express'
import httpStatus from "http-status"
import config from './app/config/index.js'
import { globalErrorHandler } from './app/middleware/globalErrorHandler.js'
import { notFound } from './app/middleware/notFound.js'
import { AuthRoutes } from './app/module/auth/auth.route.js'
import { BoardRoutes } from './app/module/board/board.route.js'
import { ColumnRoutes } from './app/module/column/column.route.js'
import { ColumnTaskRoutes, TaskRoutes } from './app/module/task/task.route.js'


const app: Application = express()

app.use(
    cors({
        origin: config.frontend_url,
        credentials: true,
    }),
)

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }))

// Middleware to parse JSON bodies
app.use(express.json())
app.use(cookieParser())



// Basic route
app.get('/', async (_req: Request, res: Response) => {
    res.status(httpStatus.OK).json({
        success: true,
        message: 'Welcome to the Mini Kanban Board API',
    })
})
app.use('/api/v1/auth', AuthRoutes)
app.use('/api/v1/boards/:boardId/columns', ColumnRoutes)
app.use('/api/v1/boards', BoardRoutes)
app.use('/api/v1/columns/:columnId/tasks', ColumnTaskRoutes)
app.use('/api/v1/tasks', TaskRoutes)
app.use(notFound)
app.use(globalErrorHandler)


export default app
