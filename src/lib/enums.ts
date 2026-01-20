import type { Database } from '@/lib/database.types'
import { Constants } from '@/lib/database.types'

const createEnum = <T extends readonly string[]>(values: T) =>
  values.reduce((acc, value) => {
    ;(acc as Record<string, string>)[value] = value
    return acc
  }, {} as { [K in T[number]]: K })

export const AssignmentType = createEnum(Constants.public.Enums.assignment_type)
export type AssignmentType = Database['public']['Enums']['assignment_type']

export const ChoreStatus = createEnum(Constants.public.Enums.chore_status)
export type ChoreStatus = Database['public']['Enums']['chore_status']

export const CreditTransactionType = createEnum(
  Constants.public.Enums.credit_transaction_type
)
export type CreditTransactionType =
  Database['public']['Enums']['credit_transaction_type']

export const Difficulty = createEnum(Constants.public.Enums.difficulty)
export type Difficulty = Database['public']['Enums']['difficulty']

export const Frequency = createEnum(Constants.public.Enums.frequency)
export type Frequency = Database['public']['Enums']['frequency']

export const GraceRepaymentMode = createEnum(
  Constants.public.Enums.grace_repayment_mode
)
export type GraceRepaymentMode =
  Database['public']['Enums']['grace_repayment_mode']

export const MealType = createEnum(Constants.public.Enums.meal_type)
export type MealType = Database['public']['Enums']['meal_type']

export const ModuleId = createEnum(Constants.public.Enums.module_id)
export type ModuleId = Database['public']['Enums']['module_id']

export const NotificationType = createEnum(
  Constants.public.Enums.notification_type
)
export type NotificationType = Database['public']['Enums']['notification_type']

export const PostType = createEnum(Constants.public.Enums.post_type)
export type PostType = Database['public']['Enums']['post_type']

export const RedemptionStatus = createEnum(
  Constants.public.Enums.redemption_status
)
export type RedemptionStatus =
  Database['public']['Enums']['redemption_status']

export const RepaymentStatus = createEnum(
  Constants.public.Enums.repayment_status
)
export type RepaymentStatus = Database['public']['Enums']['repayment_status']

export const RewardStatus = createEnum(Constants.public.Enums.reward_status)
export type RewardStatus = Database['public']['Enums']['reward_status']

export const Role = createEnum(Constants.public.Enums.role)
export type Role = Database['public']['Enums']['role']

export const RoutineType = createEnum(Constants.public.Enums.routine_type)
export type RoutineType = Database['public']['Enums']['routine_type']

export const ScreenTimeTransactionType = createEnum(
  Constants.public.Enums.screen_time_transaction_type
)
export type ScreenTimeTransactionType =
  Database['public']['Enums']['screen_time_transaction_type']

export const SpendingCategory = createEnum(Constants.public.Enums.spending_category)
export type SpendingCategory = Database['public']['Enums']['spending_category']

export const TodoPriority = createEnum(Constants.public.Enums.todo_priority)
export type TodoPriority = Database['public']['Enums']['todo_priority']

export const TodoStatus = createEnum(Constants.public.Enums.todo_status)
export type TodoStatus = Database['public']['Enums']['todo_status']
