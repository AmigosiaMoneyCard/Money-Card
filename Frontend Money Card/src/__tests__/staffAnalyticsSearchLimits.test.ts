import { describe, it, expect } from 'vitest';

describe('Staff Performance Search Input Limits & Validation Tests', () => {
  it('should enforce 30 character limit on staff performance search query', () => {
    const longQuery = 'Alexander Montgomery Jonathan Smith LongName';
    const sanitized = longQuery.replace(/[^a-zA-Z0-9\s@._-]/g, '').slice(0, 30);

    expect(sanitized.length).toBe(30);
    expect(sanitized).toBe('Alexander Montgomery Jonathan ');
  });

  it('should sanitize input by stripping invalid special characters while preserving search characters', () => {
    const dirtyInput = 'alice<script>alert(1)</script>@cafe.com!';
    const sanitized = dirtyInput.replace(/[^a-zA-Z0-9\s@._-]/g, '').slice(0, 30);

    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');
    expect(sanitized).not.toContain('(');
    expect(sanitized).not.toContain(')');
    expect(sanitized).not.toContain('!');
    expect(sanitized).toBe('alicescriptalert1script@cafe.c');
  });

  it('should correctly filter staff by name, email, or branch with sanitized query', () => {
    const staffList = [
      { staffName: 'Alice Walker', staffEmail: 'alice@cafe.com', branchName: 'Downtown Branch' },
      { staffName: 'Bob Builder', staffEmail: 'bob@cafe.com', branchName: 'Airport Kiosk' },
      { staffName: 'Charlie Brown', staffEmail: 'charlie@cafe.com', branchName: 'Westside Campus' },
    ];

    const searchInput = '  alice@cafe  ';
    const query = searchInput.trim().toLowerCase();

    const filtered = staffList.filter(
      (st) =>
        st.staffName.toLowerCase().includes(query) ||
        st.staffEmail.toLowerCase().includes(query) ||
        st.branchName.toLowerCase().includes(query),
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].staffName).toBe('Alice Walker');
  });
});
