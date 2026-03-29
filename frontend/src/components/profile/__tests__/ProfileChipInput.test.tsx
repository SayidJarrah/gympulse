import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileChipInput } from '../ProfileChipInput'

function ProfileChipInputHarness() {
  const [value, setValue] = useState<string[]>(['Yoga'])

  return (
    <ProfileChipInput
      id="profile-chip-input"
      label="Preferred class types"
      value={value}
      onChange={setValue}
      placeholder="Add a class type"
    />
  )
}

describe('ProfileChipInput', () => {
  it('adds chips on Enter and removes them from the list', async () => {
    const user = userEvent.setup()

    render(<ProfileChipInputHarness />)

    const input = screen.getByLabelText(/preferred class types/i)

    await user.type(input, 'HIIT{enter}')

    expect(screen.getByText('Yoga')).toBeInTheDocument()
    expect(screen.getByText('HIIT')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove yoga/i }))

    expect(screen.queryByText('Yoga')).not.toBeInTheDocument()
    expect(screen.getByText('HIIT')).toBeInTheDocument()
  })
})
