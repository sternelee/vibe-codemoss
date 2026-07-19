// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AttachmentList } from './AttachmentList';

const mockedApi = vi.hoisted(() => ({
  convertFileSrc: vi.fn((path: string) => `asset://${path}`),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: mockedApi.convertFileSrc,
}));

vi.mock('../../../../components/common/LocalImage', () => ({
  LocalImage: ({
    localPath: _localPath,
    workspaceId: _workspaceId,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    localPath?: string | null;
    workspaceId?: string | null;
  }) => <img {...props} />,
}));

describe('AttachmentList', () => {
  afterEach(() => {
    cleanup();
    mockedApi.convertFileSrc.mockClear();
    document.body.querySelectorAll('.image-preview-overlay').forEach((node) => {
      node.remove();
    });
  });

  it('uses convertFileSrc for UNC image paths on Windows', () => {
    render(
      <AttachmentList
        attachments={[
          {
            id: 'att-1',
            fileName: 'shot.png',
            mediaType: 'image/png',
            data: '\\\\server\\share\\shot.png',
          },
        ]}
      />,
    );

    expect(mockedApi.convertFileSrc).toHaveBeenCalledWith('\\\\server\\share\\shot.png');
    expect(screen.getByAltText('shot.png').getAttribute('src')).toBe(
      'asset://\\\\server\\share\\shot.png',
    );
  });

  it('opens image preview through document.body to escape page stacking contexts', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    render(
      <AttachmentList
        attachments={[
          {
            id: 'att-preview',
            fileName: 'preview.png',
            mediaType: 'image/png',
            data: 'data:image/png;base64,AAAA',
          },
        ]}
      />,
      { container: host },
    );

    fireEvent.click(host.querySelector('.attachment-item')!);

    expect(host.querySelector('.image-preview-overlay')).toBeNull();
    expect(document.body.querySelector('.image-preview-overlay')).toBe(
      screen.getByRole('dialog', { name: 'preview.png' }),
    );
  });
});
