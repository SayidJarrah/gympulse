import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { UserProfilePage } from '../UserProfilePage'
import { useProfileStore } from '../../../store/profileStore'
import type { UserProfile } from '../../../types/userProfile'
import { getMyProfile, updateMyProfile } from '../../../api/profile'

vi.mock('../../../api/profile', () => ({
  getMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
}))

const mockedGetMyProfile = vi.mocked(getMyProfile)
const mockedUpdateMyProfile = vi.mocked(updateMyProfile)

const populatedProfile: UserProfile = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Brown',
  phone: '+48123123123',
  dateOfBirth: '1994-08-12',
  fitnessGoals: ['Build strength', 'Improve mobility'],
  preferredClassTypes: ['Yoga', 'HIIT'],
  createdAt: '2026-03-29T09:00:00Z',
  updatedAt: '2026-03-29T09:00:00Z',
}

const emptyProfile: UserProfile = {
  ...populatedProfile,
  firstName: null,
  lastName: null,
  phone: null,
  dateOfBirth: null,
  fitnessGoals: [],
  preferredClassTypes: [],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <UserProfilePage />
    </MemoryRouter>
  )
}

describe('UserProfilePage', () => {
  beforeEach(() => {
    mockedGetMyProfile.mockReset()
    mockedUpdateMyProfile.mockReset()
    useProfileStore.setState({
      profile: null,
      isLoading: false,
      isSaving: false,
      error: null,
      fieldErrors: {},
      successMessage: null,
    })
  })

  it('loads the profile on mount and renders prefilled values', async () => {
    mockedGetMyProfile.mockResolvedValueOnce(populatedProfile)

    renderPage()

    expect(mockedGetMyProfile).toHaveBeenCalledTimes(1)
    expect(await screen.findByDisplayValue('alice@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Brown')).toBeInTheDocument()
    expect(screen.getByText('Build strength')).toBeInTheDocument()
    expect(screen.getByText('Yoga')).toBeInTheDocument()
  })

  it('renders empty editable fields for first-time users with no saved profile row', async () => {
    mockedGetMyProfile.mockResolvedValueOnce(emptyProfile)

    renderPage()

    expect(await screen.findByDisplayValue('alice@example.com')).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toHaveValue('')
    expect(screen.getByLabelText(/last name/i)).toHaveValue('')
    expect(screen.getByLabelText(/phone/i)).toHaveValue('')
    expect(screen.getByLabelText(/date of birth/i)).toHaveValue('')
    expect(screen.queryByText('Build strength')).not.toBeInTheDocument()
  })

  it('renders backend field errors inline after a failed save', async () => {
    const user = userEvent.setup()

    mockedGetMyProfile.mockResolvedValueOnce(populatedProfile)
    mockedUpdateMyProfile.mockRejectedValueOnce({
      response: {
        data: {
          code: 'INVALID_FIRST_NAME',
        },
      },
    })

    renderPage()

    await screen.findByDisplayValue('Alice')
    await user.click(screen.getByRole('button', { name: /save profile/i }))

    expect(
      await screen.findByText('First name must be between 1 and 50 characters.')
    ).toBeInTheDocument()
  })

  it('submits the full editable payload and shows a success message after save', async () => {
    const user = userEvent.setup()
    const updatedProfile: UserProfile = {
      ...populatedProfile,
      firstName: 'Alicia',
      updatedAt: '2026-03-29T12:30:00Z',
    }

    mockedGetMyProfile.mockResolvedValueOnce(populatedProfile)
    mockedUpdateMyProfile.mockResolvedValueOnce(updatedProfile)

    renderPage()

    const firstNameInput = await screen.findByLabelText(/first name/i)
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Alicia')
    await user.click(screen.getByRole('button', { name: /save profile/i }))

    await waitFor(() => {
      expect(mockedUpdateMyProfile).toHaveBeenCalledWith({
        firstName: 'Alicia',
        lastName: 'Brown',
        phone: '+48123123123',
        dateOfBirth: '1994-08-12',
        fitnessGoals: ['Build strength', 'Improve mobility'],
        preferredClassTypes: ['Yoga', 'HIIT'],
      })
    })

    expect(await screen.findByText('Profile updated.')).toBeInTheDocument()
  })
})
