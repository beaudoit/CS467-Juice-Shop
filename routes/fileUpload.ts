/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import unzipper from 'unzipper'
import { type NextFunction, type Request, type Response } from 'express'

import * as challengeUtils from '../lib/challengeUtils'
import { challenges } from '../data/datacache'
import * as utils from '../lib/utils'

function ensureFileIsPassed ({ file }: Request, res: Response, next: NextFunction) {
  if (file != null) {
    next()
  } else {
    return res.status(400).json({ error: 'File is not passed' })
  }
}

async function extractZipBuffer (buffer: Buffer) {
  const directory = await unzipper.Open.buffer(buffer)
  for (const entry of directory.files) {
    const fileName = entry.path
    const absolutePath = path.resolve('uploads/complaints/' + fileName)
    challengeUtils.solveIf(challenges.fileWriteChallenge, () => { return absolutePath === path.resolve('ftp/legal.md') })
    if (absolutePath.includes(path.resolve('.'))) {
      await pipeline(entry.stream(), fs.createWriteStream('uploads/complaints/' + fileName))
    }
  }
}

async function handleZipFileUpload ({ file }: Request, res: Response, next: NextFunction) {
  if (!(file?.originalname?.toLowerCase().endsWith('.zip') ?? false)) {
    next()
    return
  }
  if (((file?.buffer) != null) && utils.isChallengeEnabled(challenges.fileWriteChallenge)) {
    try {
      await extractZipBuffer(file.buffer)
    } catch (err) {
      next(err)
      return
    }
  }
  res.status(204).end()
}

function checkUploadSize ({ file }: Request, res: Response, next: NextFunction) {
  if (file != null) {
    challengeUtils.solveIf(challenges.uploadSizeChallenge, () => { return file?.size > 100000 })
  }
  next()
}

function checkFileType ({ file }: Request, res: Response, next: NextFunction) {
  const fileType = file?.originalname.substr(file.originalname.lastIndexOf('.') + 1).toLowerCase()
  // Remove xml and yaml from allowed file types to prevent XXE and YAML bomb attacks
  const allowedFileTypes = ['pdf', 'zip']
  challengeUtils.solveIf(challenges.uploadTypeChallenge, () => {
    return !fileType || !allowedFileTypes.includes(fileType)
  })
  next()
}

export {
  ensureFileIsPassed,
  handleZipFileUpload,
  checkUploadSize,
  checkFileType
}
