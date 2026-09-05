
import { Router } from 'express'
import { auth } from '../../middleware/checkAuth'
import { validateRequest } from '../../middleware/validateRequest'
import { BoardController } from './board.controller'
import { BoardValidation } from './board.validation'

const router = Router()

router.use(auth())




router.post(
  '/',
  validateRequest(BoardValidation.createBoard),
  BoardController.createBoard,
)

router.get('/', BoardController.getMyBoards)

router.get('/:boardId', BoardController.getBoardById)

router.patch(
  '/:boardId',
  validateRequest(BoardValidation.updateBoard),
  BoardController.updateBoard,
)

router.delete('/:boardId', BoardController.deleteBoard)

router.get('/:boardId/members', BoardController.getBoardMembers)

router.post(
  '/:boardId/members',
  validateRequest(BoardValidation.shareBoard),
  BoardController.shareBoard,
)

router.patch(
  '/:boardId/members/:memberUserId',
  validateRequest(BoardValidation.updateBoardMember),
  BoardController.updateBoardMember,
)

router.delete(
  '/:boardId/members/:memberUserId',
  BoardController.removeBoardMember,
)

export const BoardRoutes = router
