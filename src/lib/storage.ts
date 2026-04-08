interface StorageConfig {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
}

export function newStorage(config?: StorageConfig) {
  return new Storage(config);
}

export class Storage {
  private endpoint: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private bucket: string;
  private region: string;

  constructor(config?: StorageConfig) {
    // 构建R2 endpoint URL
    const accountId = process.env.R2_ACCOUNT_ID;
    this.endpoint = config?.endpoint || 
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "") ||
      process.env.STORAGE_ENDPOINT || "";
    
    this.accessKeyId =
      config?.accessKey || process.env.R2_ACCESS_KEY_ID || process.env.STORAGE_ACCESS_KEY || "";
    this.secretAccessKey =
      config?.secretKey || process.env.R2_SECRET_ACCESS_KEY || process.env.STORAGE_SECRET_KEY || "";
    this.bucket = process.env.R2_BUCKET_NAME || process.env.STORAGE_BUCKET || "";
    this.region = config?.region || process.env.STORAGE_REGION || "auto";

    // 调试信息
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 R2 Storage Configuration:');
      console.log('📡 Endpoint:', this.endpoint);
      console.log('📦 Bucket:', this.bucket);
      console.log('🔑 Access Key:', this.accessKeyId ? '✅ Set' : '❌ Missing');
      console.log('🔐 Secret Key:', this.secretAccessKey ? '✅ Set' : '❌ Missing');
      console.log('🏷️ Account ID:', accountId || '❌ Missing');
    }
  }

  async uploadFile({
    body,
    key,
    contentType,
    bucket,
    onProgress,
    disposition = "inline",
  }: {
    body: Buffer | Uint8Array;
    key: string;
    contentType?: string;
    bucket?: string;
    onProgress?: (progress: number) => void;
    disposition?: "inline" | "attachment";
  }) {
    const uploadBucket = bucket || this.bucket;
    if (!uploadBucket) {
      throw new Error("Bucket is required");
    }

    const bodyArray = body instanceof Buffer ? new Uint8Array(body) : body;

    const url = `${this.endpoint}/${uploadBucket}/${key}`;

    const { AwsClient } = await import("aws4fetch");

    const client = new AwsClient({
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
    });

    const headers: Record<string, string> = {
      "Content-Type": contentType || "application/octet-stream",
      "Content-Disposition": disposition,
      "Content-Length": bodyArray.length.toString(),
    };

    const request = new Request(url, {
      method: "PUT",
      headers,
      body: bodyArray as unknown as BodyInit,
    });

    const response = await client.fetch(request);

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorBody = await response.text();
        errorDetails = errorBody;
      } catch (e) {
        errorDetails = 'Unable to read error response';
      }
      
      console.error('🚨 R2 Upload Error Details:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        bucket: uploadBucket,
        key: key,
        errorBody: errorDetails,
        accessKeyId: this.accessKeyId ? 'present' : 'missing',
        endpoint: this.endpoint
      });
      
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorDetails}`);
    }

    return {
      location: url,
      bucket: uploadBucket,
      key,
      filename: key.split("/").pop(),
      url: process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${key}`
        : process.env.STORAGE_DOMAIN
        ? `${process.env.STORAGE_DOMAIN}/${key}`
        : url,
    };
  }

  async getFile({
    key,
    bucket,
  }: {
    key: string;
    bucket?: string;
  }): Promise<{ body: Uint8Array; contentType: string | null }> {
    const targetBucket = bucket || this.bucket;
    if (!targetBucket) {
      throw new Error("Bucket is required");
    }

    const url = `${this.endpoint}/${targetBucket}/${key}`;
    const { AwsClient } = await import("aws4fetch");
    const client = new AwsClient({
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
    });

    const response = await client.fetch(new Request(url, { method: "GET" }));
    if (!response.ok) {
      throw new Error(`Get file failed: ${response.status} ${response.statusText}`);
    }

    const arr = await response.arrayBuffer();
    return {
      body: new Uint8Array(arr),
      contentType: response.headers.get("content-type"),
    };
  }

  async downloadAndUpload({
    url,
    key,
    bucket,
    contentType,
    disposition = "inline",
  }: {
    url: string;
    key: string;
    bucket?: string;
    contentType?: string;
    disposition?: "inline" | "attachment";
  }) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No body in response");
    }

    const arrayBuffer = await response.arrayBuffer();
    const body = new Uint8Array(arrayBuffer);

    return this.uploadFile({
      body,
      key,
      bucket,
      contentType,
      disposition,
    });
  }
}
